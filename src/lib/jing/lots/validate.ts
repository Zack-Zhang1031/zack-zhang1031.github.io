/**
 * Integrity validation for 100-lot collections.
 *
 * `validateCollection` returns a list of human-readable problems; an empty
 * list means the collection is complete and well-formed. Used by unit tests
 * and reusable for future collections.
 */

import type { LotCollection } from './types';

/** Certainty / fortune-promising phrases forbidden in modern fields. */
export const PROHIBITED_PATTERN =
  /必定|必然|注定|宿命|铁口|一定会|包你|血光|灾祸|改命|转运|灵验|保佑/;

export function validateCollection(collection: LotCollection): string[] {
  const problems: string[] = [];
  const { id, lots } = collection;

  if (lots.length !== 100) {
    problems.push(`${id}: expected 100 lots, got ${lots.length}`);
  }

  const seen = new Set<number>();
  const objectIds = new Set<LotCollection['lots'][number]>();
  for (const lot of lots) {
    if (seen.has(lot.number)) {
      problems.push(`${id}: duplicate lot number ${lot.number}`);
    }
    seen.add(lot.number);
    if (objectIds.has(lot)) {
      problems.push(`${id}: lot ${lot.number} object reused across entries`);
    }
    objectIds.add(lot);

    if (!lot.grade) problems.push(`${id}#${lot.number}: missing grade`);
    if (!lot.title) problems.push(`${id}#${lot.number}: missing title`);
    if (!lot.verse.length || lot.verse.some((l) => !l.trim())) {
      problems.push(`${id}#${lot.number}: missing original verse`);
    }
    if (!lot.allusion) problems.push(`${id}#${lot.number}: missing allusion`);
    if (!lot.topics.length) {
      problems.push(`${id}#${lot.number}: missing topic interpretations`);
    }
    for (const topic of lot.topics) {
      if (!topic.theme || !topic.text) {
        problems.push(`${id}#${lot.number}: empty topic field`);
      }
      if (PROHIBITED_PATTERN.test(topic.text)) {
        problems.push(`${id}#${lot.number}: prohibited certainty language in topic ${topic.theme}`);
      }
    }
    for (const caution of lot.cautions) {
      if (PROHIBITED_PATTERN.test(caution)) {
        problems.push(`${id}#${lot.number}: prohibited certainty language in caution`);
      }
    }
  }

  for (let n = 1; n <= 100; n += 1) {
    if (!seen.has(n)) problems.push(`${id}: missing lot number ${n}`);
  }

  if (!collection.sourceRef) problems.push(`${id}: missing sourceRef`);
  if (!collection.edition) problems.push(`${id}: missing edition metadata`);
  if (!collection.revision) problems.push(`${id}: missing revision`);
  return problems;
}
