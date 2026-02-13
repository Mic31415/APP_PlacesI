
import SQLite from 'react-native-sqlite-storage';
import RNFS from 'react-native-fs';

// Enable Promise-based API
SQLite.enablePromise(true);

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
                    created_at INTEGER NOT NULL,
                    FOREIGN KEY (map_id) REFERENCES Maps(id) ON DELETE CASCADE
                );
            `;

            await this.db.executeSql(createMapsTable);
            await this.db.executeSql(createPinsTable);

            // Indices
            await this.db.executeSql('CREATE INDEX IF NOT EXISTS idx_pins_map_id ON Pins(map_id);');

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
            await this.db!.executeSql('DELETE FROM Maps WHERE id = ?', [id]);
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
                `INSERT INTO Pins (id, map_id, title, description, latitude, longitude, image_uri, rating, emoji, address, created_at) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [id, pin.mapId, pin.title, pin.description || '', pin.latitude, pin.longitude, pin.imageUri || null, pin.rating, pin.emoji || '📍', pin.address || '', createdAt]
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
                    address: item.address || '', // Retrieve address
                    createdAt: item.created_at,
                });
            }
            return pins;
        } catch (error) {
            console.error('Failed to get pins:', error);
            throw error;
        }
    }

    public async deletePin(id: string): Promise<void> {
        if (!this.db) await this.initDatabase();

        try {
            await this.db!.executeSql('DELETE FROM Pins WHERE id = ?', [id]);
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

            const pins = [];
            for (let i = 0; i < pinResults.rows.length; i++) {
                const pin = { ...pinResults.rows.item(i) }; // Clone object to modify

                if (pin.image_uri) {
                    try {
                        const exists = await RNFS.exists(pin.image_uri);
                        if (exists) {
                            const base64 = await RNFS.readFile(pin.image_uri, 'base64');
                            pin.image_base64 = base64;
                        } else {
                            console.warn(`Export: Image file not found at ${pin.image_uri}`);
                        }
                    } catch (e) {
                        console.warn('Export: Failed to read image', e);
                    }
                }

                pins.push(pin);
            }

            return {
                version: 1,
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
                let imageUri = pin.image_uri; // Keep old value if no base64, though it might be broken on new device

                if (pin.image_base64) {
                    try {
                        // Create a unique filename for the imported image
                        const fileName = `imported_${pin.id}_${Date.now()}.jpg`;
                        const newPath = `${destDir}/${fileName}`;

                        await RNFS.writeFile(newPath, pin.image_base64, 'base64');
                        imageUri = 'file://' + newPath;
                    } catch (e) {
                        console.warn('Import: Failed to save image', e);
                    }
                }

                await this.db!.executeSql(
                    `INSERT OR REPLACE INTO Pins 
                    (id, map_id, title, description, latitude, longitude, image_uri, rating, emoji, address, created_at) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
                        pin.created_at
                    ]
                );
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
            await this.db!.executeSql('DELETE FROM Pins');
            await this.db!.executeSql('DELETE FROM Maps');
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
