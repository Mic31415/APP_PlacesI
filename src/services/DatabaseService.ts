
import SQLite from 'react-native-sqlite-storage';
import RNFS from 'react-native-fs';
import { deletePinImage, resolvePinImage, clearAllPinImages } from '../utils/imageStorage';

// Enable Promise-based API
SQLite.enablePromise(true);

// Tags are stored as a JSON array string. Parse defensively — any malformed or
// legacy value degrades to an empty list rather than throwing.
const parseTags = (raw: unknown): string[] => {
    if (!raw || typeof raw !== 'string') return [];
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.filter((t) => typeof t === 'string') : [];
    } catch {
        return [];
    }
};

export interface MapData {
    id: string;
    name: string;
    emoji: string;
    type?: string;
    initialRegion?: string; // JSON string of Region
    createdAt: number;
    pinCount?: number; // Calculated field
}

export interface PinData {
    id: string;
    mapId: string;
    title: string;
    description: string;
    latitude: number;
    longitude: number;
    imageUri?: string;
    rating: number;
    emoji?: string;
    address?: string; // New field
    status?: 'visited' | 'wishlist'; // 'visited' = "Been here", 'wishlist' = "Want to go"
    createdAt: number;
    // When the user actually visited (user-set), vs createdAt (when the pin was
    // added to the app). Nullable — older pins and wishlist items may not have one.
    visitedAt?: number | null;
    // Free-form labels for lightweight filtering (e.g. "ramen", "$$"). Stored as
    // a JSON array string in the DB; surfaced here as a parsed array.
    tags?: string[];
    // Full photo gallery (cover-first), stored as raw values like imageUri.
    // imageUri stays the "cover" (images[0]) for backward-compatible thumbnails.
    images?: string[];
}

export interface GlobalSearchResult extends PinData {
    mapName: string;
    mapEmoji: string;
}

export interface TripData {
    id: string;
    name: string;
    emoji: string;
    startDate: number; // start-of-day timestamp
    endDate: number;   // start-of-day timestamp (inclusive)
    notes?: string;
    createdAt: number;
    stopCount?: number; // derived
}

// A single place on a trip's itinerary. Self-contained — title/coords/address
// are snapshotted so the stop never depends on a Pin existing. day_index of -1
// means the stop is in the "Unscheduled / Ideas" bucket.
export interface TripStopData {
    id: string;
    tripId: string;
    dayIndex: number;
    sortOrder: number;
    title: string;
    latitude?: number | null;
    longitude?: number | null;
    address?: string | null;
    emoji?: string | null;
    timeMinutes?: number | null; // minutes from midnight, nullable
    note?: string | null;
    pinId?: string | null; // soft reference to source pin, if added from one
    createdAt: number;
}

class DatabaseService {
    private db: SQLite.SQLiteDatabase | null = null;

    private generateUUID(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    public async initDatabase(): Promise<void> {
        if (this.db) return;

        try {
            this.db = await SQLite.openDatabase({ name: 'PlaceI.db', location: 'default' });

            const createMapsTable = `
                CREATE TABLE IF NOT EXISTS Maps (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    emoji TEXT NOT NULL,
                    type TEXT DEFAULT 'exact',
                    initial_region TEXT,
                    created_at INTEGER NOT NULL
                );
            `;

            const createPinsTable = `
                CREATE TABLE IF NOT EXISTS Pins (
                    id TEXT PRIMARY KEY,
                    map_id TEXT NOT NULL,
                    title TEXT NOT NULL,
                    description TEXT,
                    latitude REAL NOT NULL,
                    longitude REAL NOT NULL,
                    image_uri TEXT,
                    rating INTEGER DEFAULT 0,
                    emoji TEXT,
                    address TEXT, -- New column
                    status TEXT NOT NULL DEFAULT 'visited', -- 'visited' | 'wishlist'
                    visited_at INTEGER, -- user-set visit date (nullable)
                    tags TEXT, -- JSON array of free-form tag strings
                    created_at INTEGER NOT NULL,
                    FOREIGN KEY (map_id) REFERENCES Maps(id) ON DELETE CASCADE
                );
            `;

            // One pin can have many photos. image_uri here mirrors the format
            // of Pins.image_uri (a relative managed path). Pins.image_uri is
            // kept as the cover (position 0) so every existing thumbnail reader
            // keeps working untouched.
            const createPinImagesTable = `
                CREATE TABLE IF NOT EXISTS PinImages (
                    id TEXT PRIMARY KEY,
                    pin_id TEXT NOT NULL,
                    image_uri TEXT NOT NULL,
                    position INTEGER NOT NULL DEFAULT 0,
                    created_at INTEGER NOT NULL,
                    FOREIGN KEY (pin_id) REFERENCES Pins(id) ON DELETE CASCADE
                );
            `;

            await this.db.executeSql(createMapsTable);
            await this.db.executeSql(createPinsTable);
            await this.db.executeSql(createPinImagesTable);

            // Indices
            await this.db.executeSql('CREATE INDEX IF NOT EXISTS idx_pins_map_id ON Pins(map_id);');
            await this.db.executeSql('CREATE INDEX IF NOT EXISTS idx_pinimages_pin_id ON PinImages(pin_id);');

            // Migrations
            try {
                await this.db.executeSql('ALTER TABLE Pins ADD COLUMN emoji TEXT;');
            } catch (e) { /* ignore */ }
            try {
                await this.db.executeSql('ALTER TABLE Pins ADD COLUMN address TEXT;');
            } catch (e) { /* ignore */ }
            try {
                await this.db.executeSql('ALTER TABLE Maps ADD COLUMN initial_region TEXT;');
            } catch (e) { /* ignore */ }
            try {
                // 'visited' default means every existing pin becomes "Been here" —
                // matches the app's prior journal semantics, no data migration needed.
                await this.db.executeSql("ALTER TABLE Pins ADD COLUMN status TEXT NOT NULL DEFAULT 'visited';");
            } catch (e) { /* ignore */ }
            try {
                // User-set visit date. NULL for existing pins (we don't assume
                // createdAt is the real visit date).
                await this.db.executeSql('ALTER TABLE Pins ADD COLUMN visited_at INTEGER;');
            } catch (e) { /* ignore */ }
            try {
                await this.db.executeSql('ALTER TABLE Pins ADD COLUMN tags TEXT;');
            } catch (e) { /* ignore */ }

            // Seed PinImages from the legacy single-photo column so existing pins
            // show up in the new gallery. Idempotent: only touches pins that have
            // a cover photo but no PinImages rows yet, so it's safe on every boot.
            try {
                await this.db.executeSql(
                    `INSERT INTO PinImages (id, pin_id, image_uri, position, created_at)
                     SELECT 'pi_' || id || '_0', id, image_uri, 0, created_at
                     FROM Pins
                     WHERE image_uri IS NOT NULL AND TRIM(image_uri) != ''
                       AND id NOT IN (SELECT pin_id FROM PinImages);`
                );
            } catch (e) { /* ignore */ }

            // A Trip is a named, dated journey. Its TripStops are self-contained
            // place snapshots (not foreign keys into Pins) so trips stay fully
            // decoupled from the maps/pins lifecycle — deleting a pin or map can
            // never corrupt a trip, and trips don't show up in the Maps list or
            // Travel Stats. pin_id is a soft reference only.
            const createTripsTable = `
                CREATE TABLE IF NOT EXISTS Trips (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    emoji TEXT NOT NULL DEFAULT '🧳',
                    start_date INTEGER NOT NULL,
                    end_date INTEGER NOT NULL,
                    notes TEXT,
                    created_at INTEGER NOT NULL
                );
            `;
            const createTripStopsTable = `
                CREATE TABLE IF NOT EXISTS TripStops (
                    id TEXT PRIMARY KEY,
                    trip_id TEXT NOT NULL,
                    day_index INTEGER NOT NULL DEFAULT 0, -- -1 = "Unscheduled / Ideas"
                    sort_order INTEGER NOT NULL DEFAULT 0,
                    title TEXT NOT NULL,
                    latitude REAL,
                    longitude REAL,
                    address TEXT,
                    emoji TEXT,
                    time_minutes INTEGER, -- minutes from midnight; NULL = no set time
                    note TEXT,
                    pin_id TEXT, -- soft ref to the source pin, no FK
                    created_at INTEGER NOT NULL,
                    FOREIGN KEY (trip_id) REFERENCES Trips(id) ON DELETE CASCADE
                );
            `;
            await this.db.executeSql(createTripsTable);
            await this.db.executeSql(createTripStopsTable);
            await this.db.executeSql('CREATE INDEX IF NOT EXISTS idx_tripstops_trip_id ON TripStops(trip_id);');

        } catch (error) {
            console.error('Database init failed:', error);
        }
    }

    public async getMaps(): Promise<MapData[]> {
        if (!this.db) await this.initDatabase();
        try {
            const [results] = await this.db!.executeSql('SELECT * FROM Maps ORDER BY created_at DESC');
            const maps: MapData[] = [];
            for (let i = 0; i < results.rows.length; i++) {
                const item = results.rows.item(i);

                // Get pin count for this map
                const [countResult] = await this.db!.executeSql('SELECT COUNT(*) as count FROM Pins WHERE map_id = ?', [item.id]);
                const count = countResult.rows.item(0).count;

                maps.push({
                    id: item.id,
                    name: item.name,
                    emoji: item.emoji,
                    type: item.type,
                    initialRegion: item.initial_region,
                    createdAt: item.created_at,
                    pinCount: count
                });
            }
            return maps;
        } catch (error) {
            console.error('Failed to get maps:', error);
            throw error;
        }
    }

    public async createMap(map: Omit<MapData, 'id' | 'createdAt' | 'pinCount'>): Promise<MapData> {
        if (!this.db) await this.initDatabase();
        const id = this.generateUUID();
        const createdAt = Date.now();
        try {
            await this.db!.executeSql(
                'INSERT INTO Maps (id, name, emoji, type, initial_region, created_at) VALUES (?, ?, ?, ?, ?, ?)',
                [id, map.name, map.emoji, map.type || 'exact', map.initialRegion || null, createdAt]
            );
            return { ...map, id, createdAt, pinCount: 0 };
        } catch (error) {
            console.error('Failed to create map:', error);
            throw error;
        }
    }

    public async updateMap(id: string, updates: Partial<Omit<MapData, 'id' | 'createdAt' | 'pinCount'>>): Promise<void> {
        if (!this.db) await this.initDatabase();

        const fields: string[] = [];
        const values: any[] = [];

        if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
        if (updates.emoji !== undefined) { fields.push('emoji = ?'); values.push(updates.emoji); }
        if (updates.type !== undefined) { fields.push('type = ?'); values.push(updates.type); }
        if (updates.initialRegion !== undefined) { fields.push('initial_region = ?'); values.push(updates.initialRegion); }

        if (fields.length === 0) return;

        try {
            await this.db!.executeSql(
                `UPDATE Maps SET ${fields.join(', ')} WHERE id = ?`,
                [...values, id]
            );
        } catch (error) {
            console.error('Failed to update map:', error);
            throw error;
        }
    }

    public async deleteMap(id: string): Promise<void> {
        if (!this.db) await this.initDatabase();
        try {
            // Collect the image files of every pin on this map before the rows
            // cascade-delete, so we can remove the now-orphaned files afterwards.
            // Gather both the cover column and every gallery photo, de-duped.
            const imageUris = new Set<string>();
            const [res] = await this.db!.executeSql('SELECT image_uri FROM Pins WHERE map_id = ?', [id]);
            for (let i = 0; i < res.rows.length; i++) {
                const uri = res.rows.item(i).image_uri;
                if (uri) imageUris.add(uri);
            }
            const [galleryRes] = await this.db!.executeSql(
                `SELECT pi.image_uri AS image_uri FROM PinImages pi
                 JOIN Pins p ON pi.pin_id = p.id
                 WHERE p.map_id = ?`,
                [id]
            );
            for (let i = 0; i < galleryRes.rows.length; i++) {
                const uri = galleryRes.rows.item(i).image_uri;
                if (uri) imageUris.add(uri);
            }

            // Explicit deletes (don't rely on ON DELETE CASCADE being enabled).
            await this.db!.executeSql(
                'DELETE FROM PinImages WHERE pin_id IN (SELECT id FROM Pins WHERE map_id = ?)',
                [id]
            );
            await this.db!.executeSql('DELETE FROM Maps WHERE id = ?', [id]);

            for (const uri of imageUris) {
                await deletePinImage(uri);
            }
        } catch (error) {
            console.error('Failed to delete map:', error);
            throw error;
        }
    }

    public async addPin(pin: Omit<PinData, 'id' | 'createdAt'>): Promise<PinData> {
        if (!this.db) await this.initDatabase();

        const id = this.generateUUID();
        const createdAt = Date.now();

        try {
            await this.db!.executeSql(
                `INSERT INTO Pins (id, map_id, title, description, latitude, longitude, image_uri, rating, emoji, address, status, visited_at, tags, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [id, pin.mapId, pin.title, pin.description || '', pin.latitude, pin.longitude, pin.imageUri || null, pin.rating, pin.emoji || '📍', pin.address || '', pin.status || 'visited', pin.visitedAt ?? null, JSON.stringify(pin.tags || []), createdAt]
            );
            return { ...pin, id, createdAt };
        } catch (error) {
            console.error('Failed to add pin:', error);
            throw error;
        }
    }

    public async getPins(mapId: string): Promise<PinData[]> {
        if (!this.db) await this.initDatabase();

        try {
            const [results] = await this.db!.executeSql(
                'SELECT * FROM Pins WHERE map_id = ? ORDER BY created_at DESC',
                [mapId]
            );

            // Batch-load every photo for this map's pins in one query, then group
            // by pin in JS — avoids an N+1 query per pin while still returning the
            // full gallery for the detail view.
            const galleryByPin = new Map<string, string[]>();
            const [imgResults] = await this.db!.executeSql(
                `SELECT pi.pin_id AS pin_id, pi.image_uri AS image_uri
                 FROM PinImages pi
                 JOIN Pins p ON pi.pin_id = p.id
                 WHERE p.map_id = ?
                 ORDER BY pi.pin_id, pi.position ASC`,
                [mapId]
            );
            for (let i = 0; i < imgResults.rows.length; i++) {
                const row = imgResults.rows.item(i);
                const arr = galleryByPin.get(row.pin_id) || [];
                arr.push(row.image_uri);
                galleryByPin.set(row.pin_id, arr);
            }

            const pins: PinData[] = [];
            for (let i = 0; i < results.rows.length; i++) {
                const item = results.rows.item(i);
                // Fall back to the cover column if a legacy pin somehow has no
                // PinImages rows (e.g. before the backfill ran).
                const images = galleryByPin.get(item.id)
                    || (item.image_uri ? [item.image_uri] : []);
                pins.push({
                    id: item.id,
                    mapId: item.map_id,
                    title: item.title,
                    description: item.description,
                    latitude: item.latitude,
                    longitude: item.longitude,
                    imageUri: item.image_uri,
                    rating: item.rating,
                    emoji: item.emoji || '📍',
                    address: item.address || '', // Retrieve address
                    status: item.status || 'visited',
                    visitedAt: item.visited_at ?? null,
                    tags: parseTags(item.tags),
                    createdAt: item.created_at,
                    images,
                });
            }
            return pins;
        } catch (error) {
            console.error('Failed to get pins:', error);
            throw error;
        }
    }

    // Photos for a single pin, ordered cover-first. Returns raw stored values
    // (resolve with resolvePinImage before rendering), same as PinData.imageUri.
    public async getPinImages(pinId: string): Promise<string[]> {
        if (!this.db) await this.initDatabase();
        try {
            const [results] = await this.db!.executeSql(
                'SELECT image_uri FROM PinImages WHERE pin_id = ? ORDER BY position ASC',
                [pinId]
            );
            const uris: string[] = [];
            for (let i = 0; i < results.rows.length; i++) {
                uris.push(results.rows.item(i).image_uri);
            }
            return uris;
        } catch (error) {
            console.error('Failed to get pin images:', error);
            return [];
        }
    }

    // Distinct tags across every pin, sorted — used to suggest existing tags in
    // the pin editor. Tags live as JSON in a column, so we parse and dedupe in JS.
    public async getAllTags(): Promise<string[]> {
        if (!this.db) await this.initDatabase();
        try {
            const [results] = await this.db!.executeSql(
                "SELECT tags FROM Pins WHERE tags IS NOT NULL AND tags != '' AND tags != '[]'"
            );
            const set = new Set<string>();
            for (let i = 0; i < results.rows.length; i++) {
                for (const t of parseTags(results.rows.item(i).tags)) set.add(t);
            }
            return Array.from(set).sort((a, b) => a.localeCompare(b));
        } catch (error) {
            console.error('Failed to get all tags:', error);
            return [];
        }
    }

    // Replace a pin's entire gallery with the given ordered list. Keeps the
    // legacy Pins.image_uri column in sync as the cover (images[0]) so existing
    // thumbnail readers keep working. Callers persist files first; this stores
    // the already-managed relative paths.
    public async setPinImages(pinId: string, uris: string[]): Promise<void> {
        if (!this.db) await this.initDatabase();
        try {
            await this.db!.executeSql('DELETE FROM PinImages WHERE pin_id = ?', [pinId]);

            const createdAt = Date.now();
            for (let i = 0; i < uris.length; i++) {
                await this.db!.executeSql(
                    'INSERT INTO PinImages (id, pin_id, image_uri, position, created_at) VALUES (?, ?, ?, ?, ?)',
                    [this.generateUUID(), pinId, uris[i], i, createdAt]
                );
            }

            // Cover mirror: first image, or NULL when the gallery is now empty.
            await this.db!.executeSql(
                'UPDATE Pins SET image_uri = ? WHERE id = ?',
                [uris.length > 0 ? uris[0] : null, pinId]
            );
        } catch (error) {
            console.error('Failed to set pin images:', error);
            throw error;
        }
    }

    // Every pin across every map — read-only, used by the Stats screen.
    public async getAllPins(): Promise<PinData[]> {
        if (!this.db) await this.initDatabase();

        try {
            const [results] = await this.db!.executeSql(
                'SELECT * FROM Pins ORDER BY created_at DESC'
            );

            const pins: PinData[] = [];
            for (let i = 0; i < results.rows.length; i++) {
                const item = results.rows.item(i);
                pins.push({
                    id: item.id,
                    mapId: item.map_id,
                    title: item.title,
                    description: item.description,
                    latitude: item.latitude,
                    longitude: item.longitude,
                    imageUri: item.image_uri,
                    rating: item.rating,
                    emoji: item.emoji || '📍',
                    address: item.address || '',
                    status: item.status || 'visited',
                    visitedAt: item.visited_at ?? null,
                    tags: parseTags(item.tags),
                    createdAt: item.created_at,
                });
            }
            return pins;
        } catch (error) {
            console.error('Failed to get all pins:', error);
            return [];
        }
    }

    public async searchPinsGlobal(query: string, limit: number = 100): Promise<GlobalSearchResult[]> {
        if (!this.db) await this.initDatabase();

        const trimmed = query.trim();
        if (!trimmed) return [];

        const sanitized = trimmed.replace(/[%_]/g, (m) => `\\${m}`);
        const like = `%${sanitized}%`;

        try {
            const [results] = await this.db!.executeSql(
                `SELECT
                    Pins.id, Pins.map_id, Pins.title, Pins.description,
                    Pins.latitude, Pins.longitude, Pins.image_uri, Pins.rating,
                    Pins.emoji, Pins.address, Pins.status, Pins.visited_at, Pins.tags, Pins.created_at,
                    Maps.name AS map_name, Maps.emoji AS map_emoji
                 FROM Pins
                 JOIN Maps ON Pins.map_id = Maps.id
                 WHERE Pins.title LIKE ? ESCAPE '\\'
                    OR Pins.description LIKE ? ESCAPE '\\'
                    OR Pins.address LIKE ? ESCAPE '\\'
                    OR Pins.tags LIKE ? ESCAPE '\\'
                    OR Maps.name LIKE ? ESCAPE '\\'
                 ORDER BY Pins.created_at DESC
                 LIMIT ?`,
                [like, like, like, like, like, limit]
            );

            const out: GlobalSearchResult[] = [];
            for (let i = 0; i < results.rows.length; i++) {
                const item = results.rows.item(i);
                out.push({
                    id: item.id,
                    mapId: item.map_id,
                    title: item.title,
                    description: item.description,
                    latitude: item.latitude,
                    longitude: item.longitude,
                    imageUri: item.image_uri,
                    rating: item.rating,
                    emoji: item.emoji || '📍',
                    address: item.address || '',
                    status: item.status || 'visited',
                    visitedAt: item.visited_at ?? null,
                    tags: parseTags(item.tags),
                    createdAt: item.created_at,
                    mapName: item.map_name,
                    mapEmoji: item.map_emoji,
                });
            }
            return out;
        } catch (error) {
            console.error('Failed to search pins:', error);
            return [];
        }
    }

    public async deletePin(id: string): Promise<void> {
        if (!this.db) await this.initDatabase();

        try {
            // Gather the cover plus every gallery photo (de-duped) before the
            // row and its cascading PinImages rows are gone, so we can delete
            // the now-orphaned files afterwards.
            const imageUris = new Set<string>();
            const [res] = await this.db!.executeSql('SELECT image_uri FROM Pins WHERE id = ?', [id]);
            if (res.rows.length && res.rows.item(0).image_uri) {
                imageUris.add(res.rows.item(0).image_uri);
            }
            const [galleryRes] = await this.db!.executeSql(
                'SELECT image_uri FROM PinImages WHERE pin_id = ?',
                [id]
            );
            for (let i = 0; i < galleryRes.rows.length; i++) {
                const uri = galleryRes.rows.item(i).image_uri;
                if (uri) imageUris.add(uri);
            }

            // Explicit delete (don't rely on ON DELETE CASCADE being enabled).
            await this.db!.executeSql('DELETE FROM PinImages WHERE pin_id = ?', [id]);
            await this.db!.executeSql('DELETE FROM Pins WHERE id = ?', [id]);

            for (const uri of imageUris) {
                await deletePinImage(uri);
            }
        } catch (error) {
            console.error('Failed to delete pin:', error);
            throw error;
        }
    }

    public async updatePin(id: string, updates: Partial<Omit<PinData, 'id' | 'createdAt' | 'mapId'>>): Promise<void> {
        if (!this.db) await this.initDatabase();

        const fields: string[] = [];
        const values: any[] = [];

        if (updates.title !== undefined) { fields.push('title = ?'); values.push(updates.title); }
        if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }
        if (updates.latitude !== undefined) { fields.push('latitude = ?'); values.push(updates.latitude); }
        if (updates.longitude !== undefined) { fields.push('longitude = ?'); values.push(updates.longitude); }
        if (updates.rating !== undefined) { fields.push('rating = ?'); values.push(updates.rating); }
        if (updates.emoji !== undefined) { fields.push('emoji = ?'); values.push(updates.emoji); }
        if (updates.address !== undefined) { fields.push('address = ?'); values.push(updates.address); }
        if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }
        if (updates.visitedAt !== undefined) { fields.push('visited_at = ?'); values.push(updates.visitedAt); }
        if (updates.tags !== undefined) { fields.push('tags = ?'); values.push(JSON.stringify(updates.tags || [])); }
        if (updates.imageUri !== undefined) { fields.push('image_uri = ?'); values.push(updates.imageUri); }

        if (fields.length === 0) return;

        try {
            await this.db!.executeSql(
                `UPDATE Pins SET ${fields.join(', ')} WHERE id = ?`,
                [...values, id]
            );
        } catch (error) {
            console.error('Failed to update pin:', error);
            throw error;
        }
    }

    // --- Trips ---------------------------------------------------------------

    private mapTripRow(item: any): TripData {
        return {
            id: item.id,
            name: item.name,
            emoji: item.emoji,
            startDate: item.start_date,
            endDate: item.end_date,
            notes: item.notes ?? undefined,
            createdAt: item.created_at,
        };
    }

    private mapTripStopRow(item: any): TripStopData {
        return {
            id: item.id,
            tripId: item.trip_id,
            dayIndex: item.day_index,
            sortOrder: item.sort_order,
            title: item.title,
            latitude: item.latitude ?? null,
            longitude: item.longitude ?? null,
            address: item.address ?? null,
            emoji: item.emoji ?? null,
            timeMinutes: item.time_minutes ?? null,
            note: item.note ?? null,
            pinId: item.pin_id ?? null,
            createdAt: item.created_at,
        };
    }

    public async createTrip(trip: Omit<TripData, 'id' | 'createdAt' | 'stopCount'>): Promise<TripData> {
        if (!this.db) await this.initDatabase();
        const id = this.generateUUID();
        const createdAt = Date.now();
        try {
            await this.db!.executeSql(
                'INSERT INTO Trips (id, name, emoji, start_date, end_date, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [id, trip.name, trip.emoji || '🧳', trip.startDate, trip.endDate, trip.notes || null, createdAt]
            );
            return { ...trip, id, createdAt, stopCount: 0 };
        } catch (error) {
            console.error('Failed to create trip:', error);
            throw error;
        }
    }

    public async getTrips(): Promise<TripData[]> {
        if (!this.db) await this.initDatabase();
        try {
            const [results] = await this.db!.executeSql('SELECT * FROM Trips ORDER BY start_date DESC, created_at DESC');
            const trips: TripData[] = [];
            for (let i = 0; i < results.rows.length; i++) {
                const item = results.rows.item(i);
                const [countRes] = await this.db!.executeSql('SELECT COUNT(*) as count FROM TripStops WHERE trip_id = ?', [item.id]);
                trips.push({ ...this.mapTripRow(item), stopCount: countRes.rows.item(0).count });
            }
            return trips;
        } catch (error) {
            console.error('Failed to get trips:', error);
            throw error;
        }
    }

    public async getTrip(id: string): Promise<TripData | null> {
        if (!this.db) await this.initDatabase();
        try {
            const [results] = await this.db!.executeSql('SELECT * FROM Trips WHERE id = ?', [id]);
            if (results.rows.length === 0) return null;
            const [countRes] = await this.db!.executeSql('SELECT COUNT(*) as count FROM TripStops WHERE trip_id = ?', [id]);
            return { ...this.mapTripRow(results.rows.item(0)), stopCount: countRes.rows.item(0).count };
        } catch (error) {
            console.error('Failed to get trip:', error);
            throw error;
        }
    }

    public async updateTrip(id: string, updates: Partial<Omit<TripData, 'id' | 'createdAt' | 'stopCount'>>): Promise<void> {
        if (!this.db) await this.initDatabase();
        const fields: string[] = [];
        const values: any[] = [];
        if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
        if (updates.emoji !== undefined) { fields.push('emoji = ?'); values.push(updates.emoji); }
        if (updates.startDate !== undefined) { fields.push('start_date = ?'); values.push(updates.startDate); }
        if (updates.endDate !== undefined) { fields.push('end_date = ?'); values.push(updates.endDate); }
        if (updates.notes !== undefined) { fields.push('notes = ?'); values.push(updates.notes || null); }
        if (fields.length === 0) return;
        try {
            await this.db!.executeSql(`UPDATE Trips SET ${fields.join(', ')} WHERE id = ?`, [...values, id]);
        } catch (error) {
            console.error('Failed to update trip:', error);
            throw error;
        }
    }

    public async deleteTrip(id: string): Promise<void> {
        if (!this.db) await this.initDatabase();
        try {
            // Explicit deletes (don't rely on ON DELETE CASCADE being enabled).
            await this.db!.executeSql('DELETE FROM TripStops WHERE trip_id = ?', [id]);
            await this.db!.executeSql('DELETE FROM Trips WHERE id = ?', [id]);
        } catch (error) {
            console.error('Failed to delete trip:', error);
            throw error;
        }
    }

    public async getTripStops(tripId: string): Promise<TripStopData[]> {
        if (!this.db) await this.initDatabase();
        try {
            // Day order first; within a day, timed stops (sorted by time) come
            // before untimed ones, then by explicit sort order, then insertion.
            const [results] = await this.db!.executeSql(
                `SELECT * FROM TripStops WHERE trip_id = ?
                 ORDER BY day_index ASC,
                          CASE WHEN time_minutes IS NULL THEN 1 ELSE 0 END ASC,
                          time_minutes ASC,
                          sort_order ASC,
                          created_at ASC`,
                [tripId]
            );
            const stops: TripStopData[] = [];
            for (let i = 0; i < results.rows.length; i++) {
                stops.push(this.mapTripStopRow(results.rows.item(i)));
            }
            return stops;
        } catch (error) {
            console.error('Failed to get trip stops:', error);
            throw error;
        }
    }

    public async addTripStop(stop: Omit<TripStopData, 'id' | 'createdAt' | 'sortOrder'> & { sortOrder?: number }): Promise<TripStopData> {
        if (!this.db) await this.initDatabase();
        const id = this.generateUUID();
        const createdAt = Date.now();
        try {
            // Append to the end of its day unless an explicit order is given.
            let sortOrder = stop.sortOrder;
            if (sortOrder === undefined) {
                const [maxRes] = await this.db!.executeSql(
                    'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM TripStops WHERE trip_id = ? AND day_index = ?',
                    [stop.tripId, stop.dayIndex]
                );
                sortOrder = maxRes.rows.item(0).next;
            }
            await this.db!.executeSql(
                `INSERT INTO TripStops (id, trip_id, day_index, sort_order, title, latitude, longitude, address, emoji, time_minutes, note, pin_id, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [id, stop.tripId, stop.dayIndex, sortOrder, stop.title, stop.latitude ?? null, stop.longitude ?? null,
                 stop.address ?? null, stop.emoji ?? null, stop.timeMinutes ?? null, stop.note ?? null, stop.pinId ?? null, createdAt]
            );
            return { ...stop, id, sortOrder, createdAt } as TripStopData;
        } catch (error) {
            console.error('Failed to add trip stop:', error);
            throw error;
        }
    }

    public async addTripStopsFromPins(tripId: string, dayIndex: number, pins: PinData[]): Promise<void> {
        for (const pin of pins) {
            await this.addTripStop({
                tripId,
                dayIndex,
                title: pin.title,
                latitude: pin.latitude,
                longitude: pin.longitude,
                address: pin.address ?? null,
                emoji: pin.emoji ?? '📍',
                pinId: pin.id,
                timeMinutes: null,
                note: null,
            });
        }
    }

    public async updateTripStop(id: string, updates: Partial<Omit<TripStopData, 'id' | 'tripId' | 'createdAt'>>): Promise<void> {
        if (!this.db) await this.initDatabase();
        const fields: string[] = [];
        const values: any[] = [];
        if (updates.dayIndex !== undefined) { fields.push('day_index = ?'); values.push(updates.dayIndex); }
        if (updates.sortOrder !== undefined) { fields.push('sort_order = ?'); values.push(updates.sortOrder); }
        if (updates.title !== undefined) { fields.push('title = ?'); values.push(updates.title); }
        if (updates.latitude !== undefined) { fields.push('latitude = ?'); values.push(updates.latitude ?? null); }
        if (updates.longitude !== undefined) { fields.push('longitude = ?'); values.push(updates.longitude ?? null); }
        if (updates.address !== undefined) { fields.push('address = ?'); values.push(updates.address ?? null); }
        if (updates.emoji !== undefined) { fields.push('emoji = ?'); values.push(updates.emoji ?? null); }
        if (updates.timeMinutes !== undefined) { fields.push('time_minutes = ?'); values.push(updates.timeMinutes ?? null); }
        if (updates.note !== undefined) { fields.push('note = ?'); values.push(updates.note ?? null); }
        if (updates.pinId !== undefined) { fields.push('pin_id = ?'); values.push(updates.pinId ?? null); }
        if (fields.length === 0) return;
        try {
            await this.db!.executeSql(`UPDATE TripStops SET ${fields.join(', ')} WHERE id = ?`, [...values, id]);
        } catch (error) {
            console.error('Failed to update trip stop:', error);
            throw error;
        }
    }

    public async deleteTripStop(id: string): Promise<void> {
        if (!this.db) await this.initDatabase();
        try {
            await this.db!.executeSql('DELETE FROM TripStops WHERE id = ?', [id]);
        } catch (error) {
            console.error('Failed to delete trip stop:', error);
            throw error;
        }
    }

    // Move a stop to another day, appending to the end of that day.
    public async moveTripStop(id: string, dayIndex: number): Promise<void> {
        if (!this.db) await this.initDatabase();
        try {
            const [tripRes] = await this.db!.executeSql('SELECT trip_id FROM TripStops WHERE id = ?', [id]);
            if (tripRes.rows.length === 0) return;
            const tripId = tripRes.rows.item(0).trip_id;
            const [maxRes] = await this.db!.executeSql(
                'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM TripStops WHERE trip_id = ? AND day_index = ?',
                [tripId, dayIndex]
            );
            await this.db!.executeSql(
                'UPDATE TripStops SET day_index = ?, sort_order = ? WHERE id = ?',
                [dayIndex, maxRes.rows.item(0).next, id]
            );
        } catch (error) {
            console.error('Failed to move trip stop:', error);
            throw error;
        }
    }

    // When a trip's date range shrinks, sweep any stop whose day no longer
    // exists into the Unscheduled bucket (-1) so nothing is silently lost.
    public async reflowStopsToValidDays(tripId: string, dayCount: number): Promise<void> {
        if (!this.db) await this.initDatabase();
        try {
            await this.db!.executeSql(
                'UPDATE TripStops SET day_index = -1 WHERE trip_id = ? AND day_index >= ?',
                [tripId, dayCount]
            );
        } catch (error) {
            console.error('Failed to reflow trip stops:', error);
            throw error;
        }
    }

    // --- Export/Import ---
    public async getAllData(): Promise<{ version: number, timestamp: number, maps: any[], pins: any[] }> {
        if (!this.db) await this.initDatabase();

        try {
            const [mapResults] = await this.db!.executeSql('SELECT * FROM Maps');
            const [pinResults] = await this.db!.executeSql('SELECT * FROM Pins');

            const maps = [];
            for (let i = 0; i < mapResults.rows.length; i++) {
                maps.push(mapResults.rows.item(i));
            }

            // Read a managed image file to base64, healing relative/legacy paths.
            const readImageBase64 = async (storedUri: string): Promise<string | null> => {
                const fsPath = (resolvePinImage(storedUri) || '').replace(/^file:\/\//, '');
                try {
                    const exists = fsPath ? await RNFS.exists(fsPath) : false;
                    if (exists) return await RNFS.readFile(fsPath, 'base64');
                    console.warn(`Export: Image file not found at ${fsPath}`);
                } catch (e) {
                    console.warn('Export: Failed to read image', e);
                }
                return null;
            };

            const pins = [];
            for (let i = 0; i < pinResults.rows.length; i++) {
                const pin = { ...pinResults.rows.item(i) }; // Clone object to modify

                // Full gallery (v2). Each entry carries its own base64 so the whole
                // photo set round-trips through a backup.
                const [galleryRes] = await this.db!.executeSql(
                    'SELECT image_uri, position FROM PinImages WHERE pin_id = ? ORDER BY position ASC',
                    [pin.id]
                );
                const images: { position: number, image_base64: string }[] = [];
                for (let j = 0; j < galleryRes.rows.length; j++) {
                    const row = galleryRes.rows.item(j);
                    const base64 = await readImageBase64(row.image_uri);
                    if (base64) images.push({ position: row.position, image_base64: base64 });
                }
                if (images.length > 0) pin.images = images;

                // Keep the legacy single cover base64 too so OLDER app versions can
                // still import this (forward-compatible) backup.
                if (pin.image_uri) {
                    const cover = await readImageBase64(pin.image_uri);
                    if (cover) pin.image_base64 = cover;
                }

                pins.push(pin);
            }

            return {
                version: 2,
                timestamp: Date.now(),
                maps,
                pins
            };
        } catch (error) {
            console.error('Failed to get all data:', error);
            throw error;
        }
    }

    public async importData(data: { maps: any[], pins: any[], version?: number }): Promise<void> {
        if (!this.db) await this.initDatabase();

        if (!data) {
            throw new Error("File is empty or not a valid JSON object.");
        }
        if (data.version === undefined && (!data.maps && !data.pins)) {
            // Basic heuristic: if no version AND no data fields, it's likely wrong
            throw new Error("This file does not appear to be a Places I... backup.");
        }
        if (!Array.isArray(data.maps) || !Array.isArray(data.pins)) {
            throw new Error("Backup file structure is invalid (missing maps or pins).");
        }

        try {
            const destDir = RNFS.DocumentDirectoryPath;

            // 1. Import Maps
            for (const map of data.maps) {
                await this.db!.executeSql(
                    `INSERT OR REPLACE INTO Maps (id, name, emoji, type, initial_region, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
                    [map.id, map.name, map.emoji, map.type || 'exact', map.initial_region || null, map.created_at]
                );
            }

            // 2. Import Pins (Foreign Key depends on Maps existing)
            for (const pin of data.pins) {
                // Write each embedded base64 photo to a managed file and collect
                // the relative paths (cover-first). Filenames stay relative to the
                // Documents dir so they survive iOS sandbox UUID changes.
                const imagePaths: string[] = [];

                if (Array.isArray(pin.images) && pin.images.length > 0) {
                    // v2 backup — full gallery.
                    const sorted = [...pin.images].sort(
                        (a, b) => (a.position || 0) - (b.position || 0)
                    );
                    for (let k = 0; k < sorted.length; k++) {
                        const entry = sorted[k];
                        if (!entry || !entry.image_base64) continue;
                        try {
                            const fileName = `imported_${pin.id}_${k}_${Date.now()}.jpg`;
                            await RNFS.writeFile(`${destDir}/${fileName}`, entry.image_base64, 'base64');
                            imagePaths.push(fileName);
                        } catch (e) {
                            console.warn('Import: Failed to save gallery image', e);
                        }
                    }
                } else if (pin.image_base64) {
                    // v1 backup — single cover photo.
                    try {
                        const fileName = `imported_${pin.id}_${Date.now()}.jpg`;
                        await RNFS.writeFile(`${destDir}/${fileName}`, pin.image_base64, 'base64');
                        imagePaths.push(fileName);
                    } catch (e) {
                        console.warn('Import: Failed to save image', e);
                    }
                }

                // Cover = first written file, else the stored value (may be broken
                // on a new device, but matches the previous behaviour).
                const imageUri = imagePaths.length > 0 ? imagePaths[0] : pin.image_uri;

                await this.db!.executeSql(
                    `INSERT OR REPLACE INTO Pins
                    (id, map_id, title, description, latitude, longitude, image_uri, rating, emoji, address, status, visited_at, tags, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        pin.id,
                        pin.map_id,
                        pin.title,
                        pin.description,
                        pin.latitude,
                        pin.longitude,
                        imageUri,
                        pin.rating,
                        pin.emoji,
                        pin.address || '',
                        pin.status || 'visited', // older backups won't have status
                        pin.visited_at ?? null, // older backups won't have a visit date
                        pin.tags ?? null, // older backups won't have tags
                        pin.created_at
                    ]
                );

                // Rebuild this pin's gallery rows (replace any existing).
                await this.db!.executeSql('DELETE FROM PinImages WHERE pin_id = ?', [pin.id]);
                const galleryPaths = imagePaths.length > 0
                    ? imagePaths
                    : (imageUri ? [imageUri] : []);
                for (let k = 0; k < galleryPaths.length; k++) {
                    await this.db!.executeSql(
                        'INSERT INTO PinImages (id, pin_id, image_uri, position, created_at) VALUES (?, ?, ?, ?, ?)',
                        [this.generateUUID(), pin.id, galleryPaths[k], k, pin.created_at || Date.now()]
                    );
                }
            }
        } catch (error) {
            console.error('Failed to import data:', error);
            throw error;
        }
    }

    public async clearAllData(): Promise<void> {
        if (!this.db) await this.initDatabase();

        try {
            // Delete all data. Foreign key constraints might handle pins if Maps are deleted,
            // but explicit deletion is safer and clearer.
            await this.db!.executeSql('DELETE FROM PinImages');
            await this.db!.executeSql('DELETE FROM Pins');
            await this.db!.executeSql('DELETE FROM Maps');
            await this.db!.executeSql('DELETE FROM TripStops');
            await this.db!.executeSql('DELETE FROM Trips');

            // Remove the now-orphaned image files too.
            await clearAllPinImages();
        } catch (error) {
            console.error('Failed to clear all data:', error);
            throw error;
        }
    }

    public async exportMapData(mapId: string): Promise<{ map: MapData, pins: PinData[] }> {
        if (!this.db) await this.initDatabase();

        try {
            // Get Map Details
            const [mapResult] = await this.db!.executeSql('SELECT * FROM Maps WHERE id = ?', [mapId]);
            if (mapResult.rows.length === 0) throw new Error('Map not found');
            const mapItem = mapResult.rows.item(0);
            const map: MapData = {
                id: mapItem.id,
                name: mapItem.name,
                emoji: mapItem.emoji,
                type: mapItem.type,
                initialRegion: mapItem.initial_region,
                createdAt: mapItem.created_at,
                pinCount: 0 // Will be ignored on import or recalculated
            };

            // Get Pins
            const pins = await this.getPins(mapId);

            return { map, pins };
        } catch (error) {
            console.error('Failed to export map:', error);
            throw error;
        }
    }
}

export const databaseService = new DatabaseService();
