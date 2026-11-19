// Each row follows the same four orientations in the HDB floor plans.
const stackGroups = [
  [117, 119, 121, 123], // 200B
  [133, 135, 137, 139], // 201A
  [108, 110, 112, 114], // 204A
  [124, 126, 128, 130], // 204B
];
const orientations = [[1, -1], [-1, -1], [-1, 1], [1, 1]];

export const type2WalkthroughLayouts = new Map(
  stackGroups.flatMap(stacks => stacks.map((stack, index) => [String(stack), orientations[index]]))
);
