import { writable } from "svelte/store"
import { CursorDirections } from "$lib/constants/cursorDirections"

export const CursorDirection = writable<CursorDirections>(CursorDirections.Down)