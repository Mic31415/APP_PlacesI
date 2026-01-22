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
    MapView: { mapId: string };
    PinDetail: { pinId: string };
    CreatePin: undefined;
};

export type CreateStackParamList = {
    CreateMap: undefined;
    CreatePin: { mapId: string };
};

export type SettingsStackParamList = {
    SettingsList: undefined;
    Premium: undefined;
    DataManagement: undefined;
};
