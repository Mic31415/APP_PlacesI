export type RootStackParamList = {
    Main: undefined;
    Onboarding: undefined;
};

export type MainTabParamList = {
    Home: undefined;
    Create: undefined;
    Settings: undefined;
};

export type HomeStackParamList = {
    MapList: undefined;
    MapView: { mapId: string; mapName: string; emoji: string; focusPinId?: string };
    PinDetail: { pinId: string };
    CreatePin: { mapId: string; mapEmoji?: string; pin?: any };
    GlobalSearch: undefined;
    MapPicker: {
        initialRegion?: {
            latitude: number;
            longitude: number;
            latitudeDelta: number;
            longitudeDelta: number;
        };
        onSelectLocation: (location: { latitude: number; longitude: number; address: string }) => void;
    };
};

export type CreateStackParamList = {
    CreateMap: undefined;
    CreatePin: { mapId: string; mapEmoji?: string };
    MapPicker: {
        initialRegion?: {
            latitude: number;
            longitude: number;
            latitudeDelta: number;
            longitudeDelta: number;
        };
        onSelectLocation: (location: { latitude: number; longitude: number; address: string }) => void;
    };
};

export type SettingsStackParamList = {
    SettingsList: undefined;
    Premium: undefined;
    DataManagement: undefined;
};
