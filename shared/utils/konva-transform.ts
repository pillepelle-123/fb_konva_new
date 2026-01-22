/**
 * Converts a Konva position (with rotation offset) back to state position (without offset)
 * This is the inverse operation of adjusting position for rotation offset
 *
 * @param konvaX - The x position from Konva (with offset applied)
 * @param konvaY - The y position from Konva (with offset applied)
 * @param width - The element width
 * @param height - The element height
 * @returns Object with x and y coordinates in state space (without offset)
 */
export function konvaToStatePosition(
  konvaX: number,
  konvaY: number,
  width: number,
  height: number
): { x: number; y: number } {
  // Calculate the offset that was applied for rotation pivot point
  const offsetX = width / 2;
  const offsetY = height / 2;

  // Remove the offset to get back to the original state position
  const actualX = konvaX - offsetX;
  const actualY = konvaY - offsetY;

  return { x: actualX, y: actualY };
}