export interface RecipeSuggestion {
  title: string;
  authentic_name?: string;
  kcal: number;
  p: number; // protein (g)
  c: number; // carbs (g)
  f: number; // fat (g)
  tags: string[];
  action_buttons: ActionButton[];
}

export interface ActionButton {
  label: string;
  action: 'add_to_plan' | 'suggest_another' | 'view_recipe';
  payload?: Record<string, any>;
}

interface TextSegment {
  type: 'text';
  content: string;
}

interface RecipeSegment {
  type: 'recipe';
  data: RecipeSuggestion;
}

export type ContentSegment = TextSegment | RecipeSegment;

/**
 * Parses message content to detect recipe suggestion markers (‹‹‹recipe_suggestion {json}›››)
 * and splits content into text and recipe segments.
 */
export function parseRecipeMarkers(content: string): ContentSegment[] {
  const segments: ContentSegment[] = [];
  // Regex matches the full marker: ‹‹‹recipe_suggestion {json}›››
  // Group 1 captures the JSON string between the markers
  const markerRegex = /‹‹‹recipe_suggestion\s+({[\s\S]*?})›››/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = markerRegex.exec(content)) !== null) {
    // Add text segment before the current marker
    const textBefore = content.slice(lastIndex, match.index);
    if (textBefore.trim().length > 0) {
      segments.push({ type: 'text', content: textBefore });
    }

    // Parse the JSON from the marker
    try {
      const recipeData: RecipeSuggestion = JSON.parse(match[1]);
      segments.push({ type: 'recipe', data: recipeData });
    } catch (error) {
      console.error('Failed to parse recipe suggestion JSON:', error);
      // Fall back to treating the full marker as text if JSON is invalid
      segments.push({ type: 'text', content: match[0] });
    }

    lastIndex = markerRegex.lastIndex;
  }

  // Add remaining text after the last marker
  const textAfter = content.slice(lastIndex);
  if (textAfter.trim().length > 0) {
    segments.push({ type: 'text', content: textAfter });
  }

  return segments;
}
