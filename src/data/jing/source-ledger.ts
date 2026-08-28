export type SourceSection = 'figures' | 'audio' | 'lots' | 'rules';

interface SourceBase {
  id: string;
  section: SourceSection;
  title: string;
  url: string;
  attribution: string;
  license: string;
  retrievedAt: string;
  version: string;
  checksum: string;
  localTarget: string;
}

export type SourceRecord = SourceBase & (
  | { status: 'verified'; blockedReason?: never }
  | { status: 'verification-blocked'; blockedReason: string }
);

const blocked = (
  source: Omit<SourceBase, 'attribution' | 'license' | 'checksum'> &
    Partial<Pick<SourceBase, 'attribution' | 'license' | 'checksum'>> &
    { blockedReason: string },
): SourceRecord => ({
  ...source,
  attribution: source.attribution ?? '',
  license: source.license ?? '',
  checksum: source.checksum ?? '',
  status: 'verification-blocked',
});

const verified = (source: SourceBase): SourceRecord => ({
  ...source,
  status: 'verified',
});

export const sourceLedger: readonly SourceRecord[] = [
  /* --------------------------------------------------------------
   * Sacred imagery — all verified against Wikimedia Commons file
   * pages on 2026-08-27; checksums are sha256 of the shipped 800px
   * webp under public/jing/images/.
   * -------------------------------------------------------------- */
  verified({
    id: 'image-shakyamuni',
    section: 'figures',
    title: '释迦牟尼佛（Buddha Shakyamuni as Lord of the Munis，十七世纪中叶，大都会艺术博物馆藏）',
    url: 'https://commons.wikimedia.org/wiki/File:Buddha_Shakyamuni_as_Lord_of_the_Munis.jpg',
    attribution: '佚名；大都会艺术博物馆藏品 75274',
    license: '公有领域',
    retrievedAt: '2026-08-27',
    version: 'commons-2026-08-27-webp800',
    checksum: 'sha256:5d0920cb65e483a5875a20b61c8dd3760c77dee86b8d01b8e6bb9e822b069d91',
    localTarget: 'public/jing/images/shakyamuni.webp',
  }),
  verified({
    id: 'image-guanyin',
    section: 'figures',
    title: '观世音菩萨（Avalokiteshvara (Guanyin)，明代，洛杉矶郡艺术博物馆藏 LACMA M.2000.13）',
    url: 'https://commons.wikimedia.org/wiki/File:Avalokiteshvara_(Guanyin),_the_Bodhisattva_of_Compassion_LACMA_M.2000.13_(1_of_7).jpg',
    attribution: '佚名；LACMA 藏品 M.2000.13',
    license: '公有领域',
    retrievedAt: '2026-08-27',
    version: 'commons-2026-08-27-webp800',
    checksum: 'sha256:9452e3f3de43117ad66c860d1b6ed57bd51200433f03af83744bc7fbc36fea1b',
    localTarget: 'public/jing/images/guanyin.webp',
  }),
  verified({
    id: 'image-ksitigarbha',
    section: 'figures',
    title: '地藏菩萨（Ksitigarbha，高丽王朝十四世纪上半，大都会艺术博物馆藏 39883）',
    url: 'https://commons.wikimedia.org/wiki/File:Ksitigarbha_(Metropolitan_Museum_of_Art).jpg',
    attribution: '佚名高丽王朝画师；大都会艺术博物馆藏品 39883',
    license: '公有领域',
    retrievedAt: '2026-08-27',
    version: 'commons-2026-08-27-webp800',
    checksum: 'sha256:9be4fc847eb2c1469bb8c15b8afa2f4302149875d5caaa95405bd50ca5e789b3',
    localTarget: 'public/jing/images/ksitigarbha.webp',
  }),
  verified({
    id: 'image-yuanshi',
    section: 'figures',
    title: '元始天尊造像（明代，1967 年琅井保护性征集，禄丰恐龙博物馆藏）',
    url: 'https://commons.wikimedia.org/wiki/File:%E7%A6%84%E4%B8%B0%E6%81%90%E9%BE%99%E5%8D%9A%E7%89%A9%E9%A6%86-%E6%98%8E-1967%E5%B9%B4%E7%90%85%E4%BA%95%E4%BF%9D%E6%8A%A4%E6%80%A7%E5%BE%81%E9%9B%86-%E5%85%83%E5%A7%8B%E5%A4%A9%E5%B0%8A%E9%80%A0%E5%83%8F.jpg',
    attribution: '瑞丽江的河水（摄）',
    license: 'CC BY-SA 4.0',
    retrievedAt: '2026-08-27',
    version: 'commons-2026-08-27-webp800',
    checksum: 'sha256:71868ffeb83c588026bc38d5edd81dac206e9a31c4249b1e6208c2a98314ca6b',
    localTarget: 'public/jing/images/yuanshi.webp',
  }),
  verified({
    id: 'image-lingbao',
    section: 'figures',
    title: '灵宝天尊造像（明代，1967 年琅井保护性征集，禄丰恐龙博物馆藏）',
    url: 'https://commons.wikimedia.org/wiki/File:%E7%A6%84%E4%B8%B0%E6%81%90%E9%BE%99%E5%8D%9A%E7%89%A9%E9%A6%86-%E6%98%8E-1967%E5%B9%B4%E7%90%85%E4%BA%95%E4%BF%9D%E6%8A%A4%E6%80%A7%E5%BE%81%E9%9B%86-%E7%81%B5%E5%AE%9D%E5%A4%A9%E5%B0%8A%E9%80%A0%E5%83%8F.jpg',
    attribution: '瑞丽江的河水（摄）',
    license: 'CC BY-SA 4.0',
    retrievedAt: '2026-08-27',
    version: 'commons-2026-08-27-webp800',
    checksum: 'sha256:03385c64f0f4adb7be38bdaf3d568c2c17054ca88d529f98db5749aea03c41b9',
    localTarget: 'public/jing/images/lingbao.webp',
  }),
  verified({
    id: 'image-daode',
    section: 'figures',
    title: '道德天尊造像（明代，1967 年琅井保护性征集，禄丰恐龙博物馆藏）',
    url: 'https://commons.wikimedia.org/wiki/File:%E7%A6%84%E4%B8%B0%E6%81%90%E9%BE%99%E5%8D%9A%E7%89%A9%E9%A6%86-%E6%98%8E-1967%E5%B9%B4%E7%90%85%E4%BA%95%E4%BF%9D%E6%8A%A4%E6%80%A7%E5%BE%81%E9%9B%86-%E9%81%93%E5%BE%B7%E5%A4%A9%E5%B0%8A%E9%80%A0%E5%83%8F.jpg',
    attribution: '瑞丽江的河水（摄）',
    license: 'CC BY-SA 4.0',
    retrievedAt: '2026-08-27',
    version: 'commons-2026-08-27-webp800',
    checksum: 'sha256:fdcee224e5c3adbb625fb9830c17547da3ba34b52bcb3f16f19349e33f267f18',
    localTarget: 'public/jing/images/daode.webp',
  }),

  /* --------------------------------------------------------------
   * Ambience / instrument audio — checksums are sha256 of the
   * shipped ogg under public/jing/audio/.
   * -------------------------------------------------------------- */
  verified({
    id: 'audio-woodfish',
    section: 'audio',
    title: '木鱼敲击声（本站程序合成素材）',
    url: 'https://github.com/LeonZhangDev/leon-zhang1031.github.io/blob/main/scripts/jing/synth-woodfish.mjs',
    attribution: '本站脚本合成（scripts/jing/synth-woodfish.mjs）',
    license: '项目自产素材，CC0',
    retrievedAt: '2026-08-27',
    version: 'synth-2026-08-27',
    checksum: 'sha256:baa17033662a6f08110914223c0cdd01c5e87645c5d27f9040e17df90c4dcfe6',
    localTarget: 'public/jing/audio/woodfish.ogg',
  }),
  verified({
    id: 'audio-chime',
    section: 'audio',
    title: '磬（SingingBowl1.ogg，颂钵单击）',
    url: 'https://commons.wikimedia.org/wiki/File:SingingBowl1.ogg',
    attribution: 'BambooBeast',
    license: '公有领域',
    retrievedAt: '2026-08-27',
    version: 'commons-2026-08-27-ogg',
    checksum: 'sha256:f6088e2179920217e74d78acc52211fc0dce7a20ae922b1c421d0fae86dcbaba',
    localTarget: 'public/jing/audio/chime.ogg',
  }),
  verified({
    id: 'audio-bell',
    section: 'audio',
    title: '梵钟（Bonsyou5599.ogg，日本寺钟）',
    url: 'https://commons.wikimedia.org/wiki/File:Bonsyou5599.ogg',
    attribution: 'Jnn（日）',
    license: 'CC BY 2.1 JP',
    retrievedAt: '2026-08-27',
    version: 'commons-2026-08-27-ogg',
    checksum: 'sha256:1482579f94f04fd4a8460b81afdf7524f31e1685444e8a972dcd497a66748433',
    localTarget: 'public/jing/audio/bell.ogg',
  }),
  verified({
    id: 'audio-windchime',
    section: 'audio',
    title: '风铃（Windglockenspiel.Koshi.ogg）',
    url: 'https://commons.wikimedia.org/wiki/File:Windglockenspiel.Koshi.ogg',
    attribution: 'Membeth',
    license: 'CC0',
    retrievedAt: '2026-08-27',
    version: 'commons-2026-08-27-ogg-vq3',
    checksum: 'sha256:9c5a1f7ed6eaa431c787156d9c21cdcb420324db718f2b1bbcb0ba10a2326389',
    localTarget: 'public/jing/audio/windchime.ogg',
  }),
  verified({
    id: 'audio-water',
    section: 'audio',
    title: '流水（Water flowing pouring trickling.ogg，截取 48 秒淡出）',
    url: 'https://commons.wikimedia.org/wiki/File:Water_flowing_pouring_trickling.ogg',
    attribution: 'stephan（pdsounds.org）',
    license: '公有领域',
    retrievedAt: '2026-08-27',
    version: 'commons-2026-08-27-ogg-vq3-48s',
    checksum: 'sha256:325c99df6e4c5a8b33d39f9f1b17cf73ae332dd2997c4da7b0c3375667010991',
    localTarget: 'public/jing/audio/water.ogg',
  }),
  verified({
    id: 'audio-pine-wind',
    section: 'audio',
    title: '松风（Wind in Swedish pine forest at 25 mps.ogg）',
    url: 'https://commons.wikimedia.org/wiki/File:Wind_in_Swedish_pine_forest_at_25_mps.ogg',
    attribution: 'W.carter',
    license: 'CC BY-SA 4.0',
    retrievedAt: '2026-08-27',
    version: 'commons-2026-08-27-ogg-vq3',
    checksum: 'sha256:35897ed93a001d4734d561d6faddbba336597165b0df859db421523adf2ab992',
    localTarget: 'public/jing/audio/pine-wind.ogg',
  }),

  verified({
    id: 'lots-guanyin',
    section: 'lots',
    title: '观音灵签通行一百签本（好查网古典批注转录为底，dcwml/suanming-zhanbu-worker 多源校勘定本互校）',
    url: 'https://guanyin.hao86.com/ + https://github.com/dcwml/suanming-zhanbu-worker/blob/main/public/assets/qian/guanyin.zh.js',
    attribution: '古典文本为公有领域；好查网转录；zh.js 数据文件自称五源以上交叉核对',
    license: '签诗、诗意、解曰、仙机、典故均为公有领域古典文本；不复制任何现代解签评论',
    retrievedAt: '2026-08-28',
    version: 'dual-transcription-2026-08-28',
    checksum: 'sha256:8eb47d241ee7b725e64b0a4895ca3064df0582b723ccaa9783373b5e583961e2',
    localTarget: 'src/data/jing/lots/guanyin.ts',
  }),
  verified({
    id: 'lots-luzu',
    section: 'lots',
    title: '吕祖灵签通行一百签本（好查网与易安居双站转录互校）',
    url: 'https://lvzu.hao86.com/ + https://www.zhouyi.cc/lingqian/lvzu/',
    attribution: '古典文本为公有领域；好查网、易安居吉祥网转录',
    license: '签诗、诗曰、解曰、卦象均为公有领域古典文本；不复制任何现代解签评论',
    retrievedAt: '2026-08-28',
    version: 'dual-transcription-2026-08-28',
    checksum: 'sha256:1709315c3e45e8da1f77bdb99ca0ee70ae8b03efc3022ee039edb6a0996a7a92',
    localTarget: 'src/data/jing/lots/luzu.ts',
  }),
  verified({
    id: 'lots-guandi',
    section: 'lots',
    title: '关帝灵签通行古本一百签（好查网转录为底，维基文库《關聖帝君靈籤》清刊本/通行本互校）',
    url: 'https://guandi.hao86.com/ + https://zh.wikisource.org/wiki/關聖帝君靈籤',
    attribution: '古典文本为公有领域；好查网转录；维基文库校录（页面文本依 CC BY-SA 4.0）',
    license: '签诗、圣意、解曰、释义、东坡解、碧仙注均为公有领域古典文本；不复制任何现代解签评论',
    retrievedAt: '2026-08-28',
    version: 'dual-transcription-2026-08-28',
    checksum: 'sha256:107da46cce2e564f846b831d6003ab77e0c532ae12fe9d5393b56d2289b657ce',
    localTarget: 'src/data/jing/lots/guandi.ts',
  }),

  verified({
    id: 'rules-calendar',
    section: 'rules',
    title: '香港天文台公历与农历对照资料（节气时刻核验参考）',
    url: 'https://www.hko.gov.hk/en/gts/time/conversion.htm',
    attribution: '香港天文台',
    license: '香港天文台网站资料使用条款（参考性核验用途）',
    retrievedAt: '2026-08-27',
    version: 'golden-fixtures-2026-08-27',
    checksum: 'sha256:eea3002ba3ce538ef64e225aa7297031fcae2b9b60e1fd0ad1033d620bcbba9c',
    localTarget: 'src/lib/jing/calendar/engine.test.ts',
  }),
  verified({
    id: 'rules-bazi',
    section: 'rules',
    title: 'lunar-typescript 1.8.6 八字与节气实现',
    url: 'https://github.com/6tail/lunar-typescript',
    attribution: '6tail/lunar-typescript contributors',
    license: 'MIT',
    retrievedAt: '2026-08-27',
    version: 'npm-1.8.6-golden-2026-08-27',
    checksum: 'sha256:105e382c20469a058fe9480913338af67abfc7f52bd38af058937858f9f7289c',
    localTarget: 'src/lib/jing/bazi/calculate.test.ts',
  }),
  verified({
    id: 'rules-yijing',
    section: 'rules',
    title: '《周易》六十四卦名与卦序（结构性数据，未转录卦爻辞）',
    url: 'https://ctext.org/book-of-changes/zh',
    attribution: 'Chinese Text Project（参照底本）',
    license: '卦名、卦序为公有领域事实性资料；本站不转录卦爻辞原文',
    retrievedAt: '2026-08-28',
    version: 'structural-2026-08-28',
    checksum: 'sha256:e70135ca8bcfd4692d67cb1bc50095a81ac10d4121e8fc0df00aff08659b6d30',
    localTarget: 'src/data/jing/hexagrams.ts',
  }),
  verified({
    id: 'rules-qimen-chai-bu',
    section: 'rules',
    title: '时家奇门拆补法金标准（对照 bigfishmarquis-qimen 参考引擎冻结）',
    url: 'https://github.com/perfhelf/bigfishmarquis-qimen',
    attribution: '鲲侯（BigFishMarquis）',
    license: 'MIT',
    retrievedAt: '2026-08-28',
    version: 'ref-6112b39-fixtures-15',
    checksum: 'sha256:3ee50cc13a962f691e3f9e4c8d07a49734938b20b659a0c3eab98b204a020bb1',
    localTarget: 'src/lib/jing/qimen/fixtures.ts',
  }),
  verified({
    id: 'rules-qimen-zhi-run',
    section: 'rules',
    title: '时家奇门置闰法金标准（含芒种/大雪置闰与超神用例，对照同一参考引擎冻结）',
    url: 'https://github.com/perfhelf/bigfishmarquis-qimen',
    attribution: '鲲侯（BigFishMarquis）',
    license: 'MIT',
    retrievedAt: '2026-08-28',
    version: 'ref-6112b39-fixtures-15',
    checksum: 'sha256:3ee50cc13a962f691e3f9e4c8d07a49734938b20b659a0c3eab98b204a020bb1',
    localTarget: 'src/lib/jing/qimen/fixtures.ts',
  }),
  verified({
    id: 'rules-qimen-maoshan',
    section: 'rules',
    title: '时家奇门茅山法金标准（纯节气定局，对照同一参考引擎冻结）',
    url: 'https://github.com/perfhelf/bigfishmarquis-qimen',
    attribution: '鲲侯（BigFishMarquis）',
    license: 'MIT',
    retrievedAt: '2026-08-28',
    version: 'ref-6112b39-fixtures-15',
    checksum: 'sha256:3ee50cc13a962f691e3f9e4c8d07a49734938b20b659a0c3eab98b204a020bb1',
    localTarget: 'src/lib/jing/qimen/fixtures.ts',
  }),
] as const;

export function getSourceGate(section: SourceSection) {
  const records = sourceLedger.filter((source) => source.section === section);
  const blockedRecords = records.filter((source) => source.status !== 'verified');
  return {
    section,
    ready: records.length > 0 && blockedRecords.length === 0,
    blockedIds: blockedRecords.map((source) => source.id),
  } as const;
}
