
import SQLite from 'react-native-sqlite-storage';

// Enable Promise-based API
SQLite.enablePromise(true);

export interface MapData {
    id: string;
    name: string;
    emoji: string;
    type?: string;
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
    createdAt: number;
}

const DATABASE_NAME = 'PlacesI.db';

export class DatabaseService {
    private db: SQLite.SQLiteDatabase | null = null;

    // Initialize Database and Create Tables
    public async initDatabase(): Promise<void> {
        if (this.db) return; // Already initialized

        try {
            this.db = await SQLite.openDatabase({
                name: DATABASE_NAME,
                location: 'default',
            });

            await this.createTables();
            console.log('Database initialized successfully');
        } catch (error) {
            console.error('Failed to initialize database:', error);
            throw error;
        }
    }

    private async createTables(): Promise<void> {
        if (!this.db) return;

        const createMapsTable = `
            CREATE TABLE IF NOT EXISTS Maps (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                emoji TEXT NOT NULL,
                type TEXT DEFAULT 'exact',
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
                created_at INTEGER NOT NULL,
                FOREIGN KEY (map_id) REFERENCES Maps(id) ON DELETE CASCADE
            );
        `;

        try {
            await this.db.executeSql(createMapsTable);
            await this.db.executeSql(createPinsTable);

            // Create Indices for Performance
            await this.db.executeSql('CREATE INDEX IF NOT EXISTS idx_pins_map_id ON Pins (map_id);');
            await this.db.executeSql('CREATE INDEX IF NOT EXISTS idx_maps_created_at ON Maps (created_at);');
            await this.db.executeSql('CREATE INDEX IF NOT EXISTS idx_pins_created_at ON Pins (created_at);');
        } catch (error) {
            console.error('Failed to create tables:', error);
            throw error;
        }
    }

    // --- Maps CRUD ---

    public async createMap(name: string, emoji: string, type: 'country' | 'state' | 'exact'): Promise<MapData> {
        if (!this.db) await this.initDatabase();

        const id = this.generateUUID();
        const createdAt = Date.now();

        try {
            // Check if 'type' column exists, if not, we might need a migration in a real app
            // For now, we'll assume the schema is fresh or we treat 'type' as metadata if schema is rigid
            // But wait, the schema definition above DID NOT include 'type'. 
            // I must update the CREATE TABLE schema first if I want to persist it properly.

            // Re-evaluating: The CREATE STATEMENT didn't have 'type'.
            // I will implement it assuming I fix the table schema too.
            await this.db!.executeSql(
                'INSERT INTO Maps (id, name, emoji, type, created_at) VALUES (?, ?, ?, ?, ?)',
                [id, name, emoji, type, createdAt]
            );
            return { id, name, emoji, type, createdAt, pinCount: 0 };
        } catch (error) {
            console.error('Failed to create map:', error);
            throw error;
        }
    }

    public async getMaps(): Promise<MapData[]> {
        if (!this.db) await this.initDatabase();

        try {
            // Get maps with pin count
            const query = `
                SELECT m.*, COUNT(p.id) as pinCount 
                FROM Maps m 
                LEFT JOIN Pins p ON m.id = p.map_id 
                GROUP BY m.id 
                ORDER BY m.created_at DESC
            `;
            const [results] = await this.db!.executeSql(query);

            const maps: MapData[] = [];
            for (let i = 0; i < results.rows.length; i++) {
                const item = results.rows.item(i);
                maps.push({
                    id: item.id,
                    name: item.name,
                    emoji: item.emoji,
                    type: (item.type === 'country' || item.type === 'state' || item.type === 'exact') ? item.type : undefined,
                    createdAt: item.created_at,
                    pinCount: item.pinCount || 0,
                });
            }
            return maps;
        } catch (error) {
            console.error('Failed to get maps:', error);
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

    // --- Pins CRUD ---

    public async addPin(pin: Omit<PinData, 'id' | 'createdAt'>): Promise<PinData> {
        if (!this.db) await this.initDatabase();

        const id = this.generateUUID();
        const createdAt = Date.now();

        try {
            await this.db!.executeSql(
                `INSERT INTO Pins (id, map_id, title, description, latitude, longitude, image_uri, rating, created_at) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [id, pin.mapId, pin.title, pin.description || '', pin.latitude, pin.longitude, pin.imageUri || null, pin.rating, createdAt]
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

    // --- Helpers ---

    private generateUUID(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
}

export const databaseService = new DatabaseService();
