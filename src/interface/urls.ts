export const MAIN_MENU_URL = '/';
export const LOAD_WORLD_VIEW_URL = '/world/load';
export const WORLD_VIEW_URL = '/world/load/:saveName';
export const NEW_WORLD_VIEW_URL = '/world/editor';
export const NEW_GAME_VIEW_URL = '/game/new';
export const LOAD_GAME_VIEW_URL = '/game/load';
export const GAME_VIEW_URL = '/game/load/:name';

export const getWorldViewUrl = (worldName: string) => `/world/load/${worldName}`
export const getGameViewUrl = (gameName: string) => `/game/load/${gameName}`;
