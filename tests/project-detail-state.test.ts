import assert from 'node:assert/strict';
import { test } from 'node:test';

import { getProjectDetailState } from '../src/lib/project-detail-state.ts';

test('keeps a project detail route loading until content has loaded', () => {
  assert.equal(
    getProjectDetailState({
      hasLoaded: false,
      isLoading: true,
      loadError: null,
      hasProject: false,
    }),
    'loading',
  );

  assert.equal(
    getProjectDetailState({
      hasLoaded: false,
      isLoading: false,
      loadError: null,
      hasProject: false,
    }),
    'loading',
  );
});

test('shows not found only after loaded content has no matching project', () => {
  assert.equal(
    getProjectDetailState({
      hasLoaded: true,
      isLoading: false,
      loadError: null,
      hasProject: false,
    }),
    'not-found',
  );
});
