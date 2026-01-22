declare module 'react-native-sqlite-storage' {
    export interface SQLiteDatabase {
        executeSql(sql: string, params?: any[]): Promise<[ResultSet]>;
        transaction(callback: (tx: Transaction) => void): Promise<void>;
    }

    export interface ResultSet {
        rows: {
            length: number;
            item(index: number): any;
        };
    }

    export interface Transaction {
        executeSql(sql: string, params?: any[], success?: (tx: Transaction, results: ResultSet) => void, error?: (tx: Transaction, error: any) => void): void;
    }

    export function openDatabase(params: any): Promise<SQLiteDatabase>;
    export function enablePromise(enable: boolean): void;
}
