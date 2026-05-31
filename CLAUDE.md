Real human experience:

There is no true playhead you can drag across the timeline: At the moment, you can broadly select a board and the film will play from the start of the board. This means that the app does not indicate exactly where we are in time. this is problematic for advanced users who need finer control. we need smooth playback cursor (playhead) positionning as if were on any other video editing software. I sent a weak LLM to investigate (they might be wrong, to keep in mind, but it reported things that are useful to know)
Remember, good code is code you can read like a sentence, you must be exemplary because the team will learn from you.

Weak LLM findings:

# Playhead Timeline Implementation - Exploration Findings

## Current State

The playhead feature kind of **exists** but is **not fully implemented**:

- **Visual Element**: A gray marker bar (8px wide, 20px tall) with ID `#timeline .marker` is defined in CSS
- **Position Updates**: The marker position is calculated based on current board time as a percentage of total duration
- **Rendering**: Only updates when boards change (via `gotoBoard()`), not smoothly during playback
- **Visibility Control**: The timeline can be toggled via `shouldRenderThumbnailDrawer` flag

## Key Components

### HTML Structure (`src/main-window.html:520-525`)

- `#timeline` - main timeline container
- `#movie-timeline-content` - flexbox container with board divs
- `marker-holder` / `marker` - the playhead visual

### Rendering (`src/js/window/main-window.js:4380-4400`)

- Builds `t-scene` divs with `flex: ${duration}` to represent board durations
- Creates `marker-holder` with nested `marker` div
- Each board's width is proportional to its duration

### Position Logic (`src/js/window/main-window.js:3628-3658`)

- `renderMarkerPosition()` calculates: `(currentBoardTime / totalDuration) * timelineWidth`
- Updates marker's left position with 0.3s CSS transition
- Updates time displays in left/right blocks

### Playback Loop (`src/js/window/main-window.js:5066-5097`)

- `playbackAdvance()` uses `requestAnimationFrame` to track playback progress
- Calculates elapsed time using `process.hrtime` for high precision
- Finds which board should be displayed based on elapsed time
- Calls `gotoBoard()` when board changes (which triggers marker update)

## Current Limitations

| Issue                                                         | Impact                                       |
| ------------------------------------------------------------- | -------------------------------------------- |
| Marker only updates on board boundaries                       | No smooth animation during playback          |
| No marker animation during audio playback                     | Disconnect between sound and visual feedback |
| Timeline zoom/pan support is for cropping, not playhead-aware | Playhead not scaled when timeline is zoomed  |
| No real-time marker position during playback within a board   | User can't see exact playback position       |
| Marker position tied to `shouldRenderThumbnailDrawer` flag    | Timeline can be hidden/non-functional        |

## Architecture Overview

```
Timeline Flow:
  playbackAdvance() [runs each frame]
    ↓ calculates elapsed time
    → finds current board
    → calls gotoBoard(boardIndex)
       ↓
       renderMarkerPosition()
         → calculates percentage of timeline
         → sets marker.style.left
```

The code structure shows the app was designed for discrete board-by-board playback rather than continuous playhead animation.

## Next Steps for Implementation

To create a functional playhead, we'd need to:

1. Call `renderMarkerPosition()` **every frame** during playback (not just on board change)
2. Make marker position aware of timeline zoom/pan transforms
3. Potentially refactor to track playback time independently of board selection
4. Update marker smoothly based on audio playback progress if available

---

# Verified Implementation Plan (Claude Sonnet 4.6)

## Root Cause

`renderMarkerPosition()` (`main-window.js:3628`) reads `boardData.boards[currentBoard].time` — the *start* of the active board, not the actual playback millisecond. `playbackAdvance()` computes exact elapsed `d` (ms) every frame but only calls `renderMarkerPosition` indirectly via `gotoBoard()` at board boundaries.

## Five Targeted Changes

### 1. `renderMarkerPosition(timeMs)` — accept explicit time
**File**: `src/js/window/main-window.js:3628`
Change signature to accept an optional `timeMs` argument, defaulting to `boardData.boards[currentBoard].time`. All 3 existing call sites (gotoBoard, lines 1107, 1127, 3551) stay unchanged — they just omit the argument.

### 2. Call `renderMarkerPosition(d)` every frame
**File**: `src/js/window/main-window.js:5066` (`playbackAdvance`)
Add one line after computing `d`, before the board-change check. This is the core fix — 60fps smooth playhead with zero structural refactor.

### 3. Disable CSS transition during playback
**Files**: `src/js/window/main-window.js:5020` (`startPlaying`), `src/js/window/main-window.js:5034` (`stopPlaying`)
`transition: left 0.3s` is good for manual navigation, bad for real-time playback (300ms lag).
Toggle `marker.style.transition = 'none'` on start, `''` on stop.

### 4. Drag-to-seek on the timeline
**File**: `src/js/window/main-window.js:4399` (`renderTimeline`)
Replace per-`t-scene` `pointerdown` listeners with a single delegated handler on `#movie-timeline-content` covering `pointerdown`, `pointermove`, `pointerup`. Converts pointer X position to milliseconds and calls `gotoBoard`.

### 5. Make marker visually legible
**File**: `src/css/mainwindow.css:696`
Change marker color from `#777` (near-invisible) to `#fff`.

## Scope
All changes confined to `main-window.js` and `mainwindow.css`. `gotoBoard()` and audio playback untouched.
