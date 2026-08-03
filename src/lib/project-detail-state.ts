export type ProjectDetailState = 'loading' | 'error' | 'ready' | 'not-found';

export function getProjectDetailState(input: {
  hasLoaded: boolean;
  isLoading: boolean;
  loadError: string | null;
  hasProject: boolean;
}): ProjectDetailState {
  if (input.isLoading) {
    return 'loading';
  }

  if (input.loadError) {
    return 'error';
  }

  if (!input.hasLoaded) {
    return 'loading';
  }

  return input.hasProject ? 'ready' : 'not-found';
}
