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

  blocked({
    id: 'lots-guanyin',
    section: 'lots',
    title: '艋舺龙山寺观音一百签（校勘候选）',
    url: 'https://www.lungshan.org.tw/fortune_sticks/index.php',
    attribution: '艋舺龙山寺',
    retrievedAt: '2026-08-26',
    version: 'web-index-2026-08-26',
    localTarget: 'src/data/jing/lots/guanyin.ts',
    blockedReason: '可用于逐签校勘，但尚未确认整套文本再利用条款与对应公版古籍底本。',
  }),
  blocked({
    id: 'lots-luzu',
    section: 'lots',
    title: '清道光二十六年吕祖灵签刻本（底本候选）',
    url: 'https://www.guoxuedashi.com/shumu/2937817go.html',
    attribution: '北京大学图书馆藏本；国学大师影印目录',
    retrievedAt: '2026-08-26',
    version: '1846-scan-candidate',
    localTarget: 'src/data/jing/lots/luzu.ts',
    blockedReason: '古籍年代满足公版候选条件，但需取得可核验扫描件并确认数字文件使用条款和校验和。',
  }),
  blocked({
    id: 'lots-guandi',
    section: 'lots',
    title: '关圣帝君灵签·姑苏钮氏藏板清刊本',
    url: 'https://zh.wikisource.org/wiki/關聖帝君靈籤',
    attribution: '维基文库校录；清刊本',
    license: '原作公有领域；维基文库页面文本依 CC BY-SA 4.0',
    retrievedAt: '2026-08-26',
    version: 'wikisource-oldid-2428837',
    localTarget: 'src/data/jing/lots/guandi.ts',
    blockedReason: '来源与许可已定位，但尚未冻结 1—100 签本地转录并计算内容校验和。',
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
  blocked({
    id: 'rules-qimen-chai-bu',
    section: 'rules',
    title: '时家奇门拆补法参考底本检索',
    url: 'https://archive.org/search?query=%E5%A5%87%E9%96%80%E9%81%81%E7%94%B2+%E6%8B%86%E8%A3%9C',
    retrievedAt: '2026-08-26',
    version: 'candidate-search-2026-08-26',
    localTarget: 'src/lib/jing/qimen/chai-bu.test.ts',
    blockedReason: '尚未选定可引用底本并转录至少 12 个完整金标准排局。',
  }),
  blocked({
    id: 'rules-qimen-zhi-run',
    section: 'rules',
    title: '时家奇门置闰法参考底本检索',
    url: 'https://archive.org/search?query=%E5%A5%87%E9%96%80%E9%81%81%E7%94%B2+%E7%BD%AE%E9%96%8F',
    retrievedAt: '2026-08-26',
    version: 'candidate-search-2026-08-26',
    localTarget: 'src/lib/jing/qimen/zhi-run.test.ts',
    blockedReason: '尚未选定可引用底本并转录至少 12 个完整金标准排局。',
  }),
  blocked({
    id: 'rules-qimen-maoshan',
    section: 'rules',
    title: '时家奇门茅山法参考底本检索',
    url: 'https://archive.org/search?query=%E8%8C%85%E5%B1%B1%E5%A5%87%E9%96%80',
    retrievedAt: '2026-08-26',
    version: 'candidate-search-2026-08-26',
    localTarget: 'src/lib/jing/qimen/maoshan.test.ts',
    blockedReason: '尚未选定可引用底本并转录至少 12 个完整金标准排局。',
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
