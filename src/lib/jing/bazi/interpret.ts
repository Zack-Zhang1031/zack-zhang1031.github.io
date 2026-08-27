/**
 * Bounded Bazi reading: consumes a calculation envelope and renders
 * neutral, study-oriented notes. It never alters pillars, never
 * persists anything, and avoids deterministic fortune claims.
 */

import type { BaziOutput, CalculationEnvelope, ShiShen, WuXing } from './calculate';

export interface BaziInterpretation {
  /** 日主一句话说明 */
  dayMaster: string;
  /** 五行分布简评 */
  elementBalance: string[];
  /** 年/月/时天干十神简评（日主不释） */
  tenGods: string[];
  /** 固定边界提醒 + 历法警告 */
  reminders: string[];
}

const DAY_MASTER_TONE: Record<WuXing, string> = {
  木: '木有生发、条达之象，传统上常用以观察一个人的成长节奏与取舍方式。',
  火: '火有温热、明亮之象，传统上常用以观察表达与行动的外放程度。',
  土: '土有承载、化育之象，传统上常用以观察稳定与协调能力。',
  金: '金有收敛、肃整之象，传统上常用以观察规则感与决断方式。',
  水: '水有润下、流动之象，传统上常用以观察思考与适应能力。',
};

const TEN_GOD_NOTE: Record<ShiShen, string> = {
  比肩: '同气之星，古书多以自立、同辈互助之象读之。',
  劫财: '同气而异质之星，古书多以竞争、分担之象读之。',
  食神: '我所生之星，古书多以表达、创造、饮食之象读之。',
  伤官: '我所生而异质之星，古书多以才思、批评之象读之。',
  偏财: '我所克而异质之星，古书多以流动资源、外物之象读之。',
  正财: '我所克之星，古书多以稳定资源、经营之象读之。',
  七杀: '克我而异质之星，古书多以压力、磨练之象读之。',
  正官: '克我之星，古书多以规范、责任之象读之。',
  偏印: '生我而异质之星，古书多以偏门学问、直觉之象读之。',
  正印: '生我之星，古书多以学问、护持之象读之。',
};

const PILLAR_LABEL = { year: '年干', month: '月干', hour: '时干' } as const;

const FIXED_REMINDERS = [
  '以上仅为传统文献研习用的结构化整理，不构成任何现实决策依据。',
  '盘面完全由输入时刻与所选规则决定；换一套规则，结论可能不同。',
  '若需深究，请回到原始文献与可靠历表，自行比对推演过程。',
] as const;

export function interpretBazi(envelope: CalculationEnvelope<BaziOutput>): BaziInterpretation {
  const { output } = envelope;

  const dayMaster = `日主为${output.dayMaster.stem}（${output.dayMaster.yinYang}${output.dayMaster.element}）。`
    + DAY_MASTER_TONE[output.dayMaster.element];

  const elementBalance: string[] = [];
  const entries = Object.entries(output.elements) as [WuXing, number][];
  const dominant = entries.filter(([, count]) => count >= 3).map(([name]) => name);
  const missing = entries.filter(([, count]) => count === 0).map(([name]) => name);
  elementBalance.push(
    `四柱干支计数：${entries.map(([name, count]) => `${name}${count}`).join('、')}。`,
  );
  if (dominant.length > 0) {
    elementBalance.push(`盘中${dominant.join('、')}气偏显，传统读法通常先从此处着眼观察整体偏向。`);
  }
  if (missing.length > 0) {
    elementBalance.push(`${missing.join('、')}未在四柱干支中直接出现；是否另取藏干参考，属不同流派的选择。`);
  }
  if (dominant.length === 0 && missing.length === 0) {
    elementBalance.push('五行分布较为均匀，传统读法多称其气较平。');
  }

  const tenGods = (['year', 'month', 'hour'] as const).map((pillar) => {
    const god = output.tenGods[pillar];
    return `${PILLAR_LABEL[pillar]}为${god}。${TEN_GOD_NOTE[god]}`;
  });

  const reminders = [
    ...envelope.warnings.map((warning) => warning.message),
    ...FIXED_REMINDERS,
  ];

  return { dayMaster, elementBalance, tenGods, reminders };
}
