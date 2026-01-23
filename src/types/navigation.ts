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
    MapView: { mapId: string; mapName: string; emoji: string };
    PinDetail: { pinId: string };
    CreatePin: { mapId: string; mapEmoji?: string; pin?: any };
};

export type CreateStackParamList = {
    CreateMap: undefined;
    CreatePin: { mapId: string; mapEmoji?: string };
};

export type SettingsStackParamList = {
    SettingsList: undefined;
    Premium: undefined;
    DataManagement: undefined;
};
