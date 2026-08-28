/**
 * Lot (签) domain contracts for the three 100-lot collections.
 *
 * Classical fields are transcriptions of public-domain texts; `topics` and
 * `cautions` are original modern notes written for this site and must never
 * use certainty or fortune-promising language (scanned in tests).
 */

import type { RandomSource } from '../random';

export type LotCollectionId = 'guanyin' | 'luzu' | 'guandi';

export interface LotTopic {
  /** 主题，如 功名 / 婚姻 / 求财。 */
  theme: string;
  /** 原创现代简释，语气必须不确定、不作承诺。 */
  text: string;
}

export interface LotEntry {
  /** 1..100，集内唯一。 */
  number: number;
  /** 传统等级，如 大吉 / 上签 / 下下；吕祖本无等级则为「无等级」。 */
  grade: string;
  /** 典故签题。 */
  title: string;
  /** 签诗原文（公有领域文本转录）。 */
  verse: string[];
  /** 典故说明（公有领域文本转录或事实性摘要）。 */
  allusion: string;
  /** 古典辅文转录：圣意 / 解曰 / 诗意 / 仙机 / 卦象 等。 */
  classical: Record<string, string>;
  /** 原创现代简释（不确定语气）。 */
  topics: LotTopic[];
  /** 高危主题与下等签的固定安全提醒。 */
  cautions: string[];
}

export interface LotCollection {
  id: LotCollectionId;
  tradition: 'buddhist' | 'taoist';
  name: string;
  /** 版本与转录说明。 */
  edition: string;
  /** 指向 source-ledger 的记录 id。 */
  sourceRef: string;
  /** 数据修订日期。 */
  revision: string;
  lots: LotEntry[];
}

/** 掷筊结果：圣筊 / 笑筊 / 阴筊。 */
export type CupResult = 'sheng' | 'xiao' | 'yin';

export interface CupThrow {
  throws: CupResult[];
}

export interface DrawInput {
  collection: LotCollection;
  source: RandomSource;
}

export interface DrawResult {
  collectionId: LotCollectionId;
  number: number;
  lot: LotEntry;
}
