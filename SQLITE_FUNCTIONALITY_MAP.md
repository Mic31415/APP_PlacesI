# 🗺️ SQLite Functionality Map (Screen-wise)

This document maps each screen's user actions to the specific SQLite operations required in [DatabaseService.ts](file:///Users/imac/Documents/Projects/APP_PlacesI/src/services/DatabaseService.ts).

---

## 1. 🏠 Home Screen ([HomeScreen.tsx](file:///Users/imac/Documents/Projects/APP_PlacesI/src/screens/home/HomeScreen.tsx))
**Goal:** Display all created maps and allow creating new ones.
*   **[READ]** [getMaps()](file:///Users/imac/Documents/Projects/APP_PlacesI/src/services/DatabaseService.ts#106-137): Fetch all maps to display in the grid/list.
    *   *Need:* Map Name, Emoji, Pin Count, Map Type (optional).
*   **[DELETE]** [deleteMap(id)](file:///Users/imac/Documents/Projects/APP_PlacesI/src/services/DatabaseService.ts#138-148): (Future) Long-press to delete a map.

## 2. ➕ Create Map Screen ([CreateScreen.tsx](file:///Users/imac/Documents/Projects/APP_PlacesI/src/screens/home/CreateScreen.tsx))
**Goal:** Input details and save a new map.
*   **[CREATE]** [createMap(name, emoji, type)](file:///Users/imac/Documents/Projects/APP_PlacesI/src/services/DatabaseService.ts#88-105): Save the new map to the database.
    *   *Action:* User taps "Create Map" button.
    *   *Result:* Insert row into [Maps](file:///Users/imac/Documents/Projects/APP_PlacesI/src/services/DatabaseService.ts#106-137) table → Navigate back to Home.

## 3. 🗺️ Map View Screen ([MapViewScreen.tsx](file:///Users/imac/Documents/Projects/APP_PlacesI/src/screens/map/MapViewScreen.tsx))
**Goal:** Display the map and all pins associated with it.
*   **[READ]** [getPins(mapId)](file:///Users/imac/Documents/Projects/APP_PlacesI/src/services/DatabaseService.ts#170-200): Fetch all pins for the current map ID.
    *   *Need:* ID, Latitude, Longitude, Emoji (for markers).
*   **[READ]** `getMapDetails(mapId)`: (Optional) Fetch map title to display in header if not passed via navigation.

## 4. 📍 Create Pin Screen ([CreatePinScreen.tsx](file:///Users/imac/Documents/Projects/APP_PlacesI/src/screens/home/CreatePinScreen.tsx))
**Goal:** add a new memory/location to the map.
*   **[CREATE]** [addPin(mapId, pinData)](file:///Users/imac/Documents/Projects/APP_PlacesI/src/services/DatabaseService.ts#151-169): Save a new pin.
    *   *Inputs:* Title, Description, Latitude, Longitude, Emoji, Image URI, Rating.
    *   *Action:* User taps "Save".
    *   *Result:* Insert row into [Pins](file:///Users/imac/Documents/Projects/APP_PlacesI/src/services/DatabaseService.ts#170-200) table → Navigate back to Map View (which accesses [getPins](file:///Users/imac/Documents/Projects/APP_PlacesI/src/services/DatabaseService.ts#170-200) again).

## 5. 📄 Pin Detail Modal ([PinDetailModal.tsx](file:///Users/imac/Documents/Projects/APP_PlacesI/src/components/map/PinDetailModal.tsx))
**Goal:** View and manage a specific pin.
*   **[UPDATE]** `updatePin(id, data)`: Edit title, description, rating, or photo.
    *   *Action:* User edits and saves.
*   **[DELETE]** [deletePin(id)](file:///Users/imac/Documents/Projects/APP_PlacesI/src/services/DatabaseService.ts#201-211): Remove the pin from the map.
    *   *Action:* User taps "Delete".
    *   *Result:* Delete row from [Pins](file:///Users/imac/Documents/Projects/APP_PlacesI/src/services/DatabaseService.ts#170-200) table → Close modal → Refresh Map View.

---

## 🛠️ Required Updates to [DatabaseService.ts](file:///Users/imac/Documents/Projects/APP_PlacesI/src/services/DatabaseService.ts)
Based on this map, we need to ensure [DatabaseService](file:///Users/imac/Documents/Projects/APP_PlacesI/src/services/DatabaseService.ts#29-221) has:
1.  [x] [createMap](file:///Users/imac/Documents/Projects/APP_PlacesI/src/services/DatabaseService.ts#88-105)
2.  [x] [getMaps](file:///Users/imac/Documents/Projects/APP_PlacesI/src/services/DatabaseService.ts#106-137)
3.  [x] [deleteMap](file:///Users/imac/Documents/Projects/APP_PlacesI/src/services/DatabaseService.ts#138-148)
4.  [x] [addPin](file:///Users/imac/Documents/Projects/APP_PlacesI/src/services/DatabaseService.ts#151-169)
5.  [x] [getPins](file:///Users/imac/Documents/Projects/APP_PlacesI/src/services/DatabaseService.ts#170-200)
6.  [x] [deletePin](file:///Users/imac/Documents/Projects/APP_PlacesI/src/services/DatabaseService.ts#201-211)
7.  [ ] `updatePin` (Need to add this!)
