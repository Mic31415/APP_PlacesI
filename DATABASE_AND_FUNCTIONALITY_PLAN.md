# 🗺️ Functionality & Database Plan

This document outlines exactly how the app will work from a user's perspective and how we will store that data behind the scenes.

---

## 📱 1. Core Functionalities & User Flow

Here is the step-by-step experience for the user:

### A. "My Maps" (Home Screen)
**What it is:** The control center where users see all their different map collections (e.g., "Favorite Restaurants", "Hiking Trips").
*   **User Action:**
    1.  User opens app → Sees a grid of "Map Cards".
    2.  Each card shows an Emoji, Name, and how many pins are inside.
    3.  **To Create:** User taps the big "+" button.
    4.  **To View:** User taps any card to open that specific map.

### B. Creating a New Map
**What it is:** Setting up a new category for locations.
*   **User Action:**
    1.  User taps "+" on Home Screen.
    2.  **Input Name:** e.g., "Sushi Spots".
    3.  **Pick Emoji:** Selects an icon (e.g., 🍱) to represent this map.
    4.  **Save:** The new map appears instantly on the Home Screen.

### C. The Map View & Adding Pins
**What it is:** The interactive map where the magic happens.
*   **User Action:**
    1.  User enters a map (e.g., "Sushi Spots").
    2.  **Navigation:** They can pan and zoom around the world.
    3.  **Adding a Pin:**
        *   User taps a specific button (e.g., "Add Pin" or long-presses map).
        *   They can drag the pin to the *exact* spot.
    4.  **Pin Details:** A form pops up:
        *   **Title:** "Sushi Jiro"
        *   **Description:** "Best tuna ever!"
        *   **Photo:** (Optional) Take a pic or pick from gallery.
        *   **Rating:** Give it 1-5 stars.
    5.  **Result:** A custom emoji marker (e.g., 🍱) appears on the map at that spot.

### D. Viewing & Managing Pins
**What it is:** Reviewing memories.
*   **User Action:**
    1.  User taps a marker on the map.
    2.  A "Bottom Sheet" or Modal pops up showing the Info (Photo, Note, Rating).
    3.  User can **Edit** (change rating/note) or **Delete** (remove pin).

---

## 🗄️ 2. Database Structure (SQLite)

We will use a relational database (SQLite) stored directly on the user's phone. This ensures it works **100% Offline**.

We need 2 main "tables" (like spreadsheets):

### Table 1: `Maps`
*Stores the categories/collections.*

| Column Name | Type | Description |
| :--- | :--- | :--- |
| [id](file:///Users/imac/Documents/Projects/APP_PlacesI/src/theme/ThemeContext.tsx#16-27) | TEXT (UUID) | Unique code for the map (e.g., "map-123") |
| `name` | TEXT | The title (e.g., "Italy Trip") |
| `emoji` | TEXT | The icon (e.g., 🇮🇹) |
| `created_at` | INTEGER | Date created (for sorting) |

### Table 2: `Pins`
*Stores the actual locations inside a map.*

| Column Name | Type | Description |
| :--- | :--- | :--- |
| [id](file:///Users/imac/Documents/Projects/APP_PlacesI/src/theme/ThemeContext.tsx#16-27) | TEXT (UUID) | Unique code for the pin |
| `map_id` | TEXT | **Link:** Which map does this belong to? (e.g., "map-123") |
| `title` | TEXT | Name of place (e.g., "Colosseum") |
| `description`| TEXT | User's notes |
| `latitude` | REAL | GPS Coordinate (N/S) |
| `longitude` | REAL | GPS Coordinate (E/W) |
| `image_uri` | TEXT | Path to the photo on user's phone |
| `rating` | INTEGER | 1-5 stars |
| `created_at` | INTEGER | Date visited |

---

## 🛠️ Technical Implementation Plan

1.  **Install SQLite:** Add `react-native-sqlite-storage` to the project.
2.  **Database Service:** Write a helper file (`DatabaseService.ts`) that handles:
    *   Creating the tables when the app starts.
    *   Functions like `createMap()`, `getMaps()`, `addPin()`, `getPinsForMap()`.
3.  **Connect UI:**
    *   Update **Home Screen** to fetch from `Maps` table instead of Mock Data.
    *   Update **Map Screen** to fetch from `Pins` table.
    *   Update **Create Pin Screen** to save to `Pins` table.

This structure allows limitless maps and pins, works fast, and costs nothing to host!
