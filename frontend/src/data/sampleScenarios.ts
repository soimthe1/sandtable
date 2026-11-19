/**
 * Canned example scenarios so a first-time officer can see the tool work in
 * under a minute instead of staring at five empty textareas. Loaded via the
 * "Try a sample scenario" row in ScenarioForm.tsx.
 *
 * All three are fictional training-vignette style scenarios - generic
 * place/unit names, no real country, conflict, or order of battle. This is
 * the same convention military schoolhouses use for unclassified staff
 * exercises (fictional nations, fictional map names), chosen deliberately so
 * a demo/onboarding scenario can never be mistaken for a real one.
 *
 * Keep this list short (3 is enough to show the range - urban, open/river,
 * and a rapid-response vignette) rather than building out a scenario
 * library; more can be added the same way later if that's ever wanted.
 */
import type {
  GeoPoint,
  OrderOfBattleEntry,
  Scenario,
  ScenarioFreeText,
  TerrainFeature,
  UiLanguage,
} from "../types/schema";

export interface SampleScenario {
  id: string;
  title: string;
  freeText: ScenarioFreeText;
  /**
   * A matching fictional scenario.json, so a sample also populates the sand
   * table, order-of-battle roster, stat chips and COA card thumbnails.
   *
   * Samples originally filled the five textareas ONLY, which meant every
   * visual in the app stayed empty unless the user happened to have a real
   * scenario.json from a workstation to import - so a new officer clicking "try
   * a sample" got a wall of text and an empty plot panel, the exact opposite
   * of the point. Any sample added later needs geometry too.
   */
  scenario: Scenario;
}

interface SampleGeo {
  home: GeoPoint;
  order_of_battle: OrderOfBattleEntry[];
  terrain_features: TerrainFeature[];
  constraints: string;
}

/**
 * Geometry is shared across languages - a real scenario.json handed over by
 * The workstation carries whatever unit names it carries and they aren't
 * translated. Only mission_name is localized, since that's the string shown
 * prominently under the plot.
 *
 * Coordinates are arbitrary and every place/unit name is invented, matching
 * the fictional-vignette convention of the free text.
 */
const SAMPLE_GEO: Record<string, SampleGeo> = {
  "urban-cordon-search": {
    home: { longitude: 34.12, latitude: 36.48 },
    order_of_battle: [
      { name: "1st Bn TAC", sidc: "SFGPUCI---E", affiliation: "friend", longitude: 34.115, latitude: 36.476 },
      { name: "A Coy (N Cordon)", sidc: "SFGPUCI---E", affiliation: "friend", longitude: 34.1235, latitude: 36.482 },
      { name: "B Coy (E Cordon)", sidc: "SFGPUCI---E", affiliation: "friend", longitude: 34.128, latitude: 36.4775 },
      { name: "MP Platoon", sidc: "SFGPUCM---E", affiliation: "friend", longitude: 34.118, latitude: 36.47 },
      {
        name: "Suspected Cell (est.)",
        sidc: "SHGPUCI---E",
        affiliation: "hostile",
        longitude: 34.1215,
        latitude: 36.479,
      },
      { name: "Old Quarter Market", sidc: "SUGPI-----E", affiliation: "neutral", longitude: 34.1195, latitude: 36.4805 },
    ],
    terrain_features: [
      {
        name: "River Kastel",
        kind: "polyline",
        positions: [
          [34.106, 36.4685, 0],
          [34.118, 36.4725, 0],
          [34.132, 36.4835, 0],
        ],
      },
      {
        name: "Old Quarter",
        kind: "polygon",
        positions: [
          [34.1165, 36.4765, 0],
          [34.1265, 36.4765, 0],
          [34.1265, 36.4855, 0],
          [34.1165, 36.4855, 0],
        ],
      },
      { name: "Footbridge", kind: "point", positions: [[34.1205, 36.4748, 0]] },
    ],
    constraints: "No vehicle movement through the market square before 0600.",
  },

  "opposed-river-crossing": {
    home: { longitude: 28.3, latitude: 41.2 },
    order_of_battle: [
      {
        name: "Engineer Coy (Bridging)",
        sidc: "SFGPUCE---E",
        affiliation: "friend",
        longitude: 28.294,
        latitude: 41.196,
      },
      { name: "A Coy (Assault)", sidc: "SFGPUCI---E", affiliation: "friend", longitude: 28.298, latitude: 41.2035 },
      { name: "C Coy (Support by Fire)", sidc: "SFGPUCI---E", affiliation: "friend", longitude: 28.29, latitude: 41.205 },
      { name: "Defending Bn (est.)", sidc: "SHGPUCI---E", affiliation: "hostile", longitude: 28.312, latitude: 41.209 },
      { name: "Ferry Hamlet", sidc: "SUGPI-----E", affiliation: "neutral", longitude: 28.305, latitude: 41.2065 },
    ],
    terrain_features: [
      {
        name: "River Vardis",
        kind: "polyline",
        positions: [
          [28.284, 41.198, 0],
          [28.298, 41.2055, 0],
          [28.316, 41.2125, 0],
        ],
      },
      {
        name: "Far Bank Objective",
        kind: "polygon",
        positions: [
          [28.3065, 41.2075, 0],
          [28.3165, 41.2075, 0],
          [28.3165, 41.2135, 0],
          [28.3065, 41.2135, 0],
        ],
      },
      { name: "Seasonal Ford", kind: "point", positions: [[28.2925, 41.2015, 0]] },
    ],
    constraints: "Bridging assets are single-lift; no second attempt before last light.",
  },

  "convoy-ambush-response": {
    home: { longitude: 44.6, latitude: 33.1 },
    order_of_battle: [
      { name: "QRF (Charlie Coy)", sidc: "SFGPUCI---E", affiliation: "friend", longitude: 44.592, latitude: 33.0955 },
      { name: "Ambushed Convoy", sidc: "SFGPUCV---E", affiliation: "friend", longitude: 44.608, latitude: 33.1045 },
      {
        name: "Medevac (15 min alert)",
        sidc: "SFGPUCAM--E",
        affiliation: "friend",
        longitude: 44.588,
        latitude: 33.109,
      },
      {
        name: "Ambush Element (est.)",
        sidc: "SHGPUCR---E",
        affiliation: "hostile",
        longitude: 44.6115,
        latitude: 33.1075,
      },
      { name: "Roadside Hamlet", sidc: "SUGPI-----E", affiliation: "neutral", longitude: 44.6045, latitude: 33.1015 },
    ],
    terrain_features: [
      {
        name: "Route Falcon",
        kind: "polyline",
        positions: [
          [44.582, 33.0915, 0],
          [44.6, 33.1005, 0],
          [44.616, 33.1105, 0],
        ],
      },
      {
        name: "High Ground (East)",
        kind: "polygon",
        positions: [
          [44.6085, 33.1055, 0],
          [44.6165, 33.1055, 0],
          [44.6165, 33.1125, 0],
          [44.6085, 33.1125, 0],
        ],
      },
      { name: "HLZ / Disused Airstrip", kind: "point", positions: [[44.5865, 33.1115, 0]] },
    ],
    constraints: "Recovery of damaged vehicles takes priority over pursuit.",
  },
};

function sampleScenario(id: string, missionName: string): Scenario {
  const geo = SAMPLE_GEO[id];
  return {
    version: "1.0",
    mission_name: missionName,
    // Fixed, not Date.now() - a sample should render identically every run.
    generated_at: "2026-01-01T00:00:00Z",
    home: geo.home,
    order_of_battle: geo.order_of_battle,
    terrain_features: geo.terrain_features,
    constraints: geo.constraints,
  };
}

const EN: SampleScenario[] = [
  {
    id: "urban-cordon-search",
    title: "Urban cordon & search",
    freeText: {
      mission_statement:
        "1st Battalion is tasked to cordon and search the Old Quarter of Kastellum to locate and " +
        "detain a mid-level insurgent cell leader believed to be sheltering among the civilian " +
        "population, within a 12-hour window, while minimizing disruption to the local market that " +
        "reopens at 0600.",
      terrain_description:
        "Dense, mixed-height masonry buildings on a tight medieval street grid; three vehicle-capable " +
        "approaches from the north and east, the south side bounded by a river with a single " +
        "footbridge. Rooftop lines of sight dominate the central square. Underground utility tunnels " +
        "connect several city blocks and are only partially mapped.",
      force_composition_notes:
        "Friendly: one infantry battalion (-), one military police platoon, one explosive ordnance " +
        "disposal team, local liaison officer. Estimated hostile: 8-12 person cell, likely armed with " +
        "small arms, possible improvised explosive devices at chokepoints. Civilian population " +
        "approximately 4,000 in the search area, market vendors present from 0500.",
      constraints_roe:
        "No forced entry into religious sites without a warrant and a local police escort. Positive " +
        "identification required before any use of force. Curfew cannot be imposed before 2200. " +
        "Vehicle movement restricted on streets narrower than 4 meters.",
      additional_notes:
        "Local police have a partial informant network but limited trust after a previous operation " +
        "went poorly; expect information to be incomplete or deliberately delayed.",
    },
    scenario: sampleScenario("urban-cordon-search", "EX KASTELLUM SWEEP (SAMPLE)"),
  },
  {
    id: "opposed-river-crossing",
    title: "Opposed river crossing",
    freeText: {
      mission_statement:
        "2nd Brigade Combat Team is tasked to establish a bridgehead across the Sarpa River at " +
        "Crossing Site Delta to enable follow-on forces to seize the road junction at Vartek within " +
        "36 hours, while a mechanized enemy regiment is reported repositioning to contest the crossing.",
      terrain_description:
        "River is 180-220m wide, moderate current, one damaged highway bridge (load-limited) and two " +
        "fording sites usable only at low water. East bank is open agricultural land with limited " +
        "cover; west bank rises into wooded high ground overlooking the crossing sites. Weather " +
        "forecast includes rain that could raise river levels within 24 hours.",
      force_composition_notes:
        "Friendly: one mechanized brigade combat team, one engineer company with bridging assets, " +
        "attached attack aviation on-call. Estimated hostile: one mechanized infantry regiment " +
        "(~1,500-2,000), organic artillery, possible obstacle-emplacement engineers already on site.",
      constraints_roe:
        "No use of the highway bridge for the initial assault wave (unconfirmed structural integrity). " +
        "Indirect fire onto the town of Vartek restricted to observed hostile firing positions only - " +
        "it remains inhabited. Air support subject to a no-strike list covering the hydroelectric " +
        "facility upstream.",
      additional_notes:
        "Higher headquarters has directed the crossing complete before the rain arrives; the timeline " +
        "is more constraining than the enemy situation.",
    },
    scenario: sampleScenario("opposed-river-crossing", "EX VARDIS CROSSING (SAMPLE)"),
  },
  {
    id: "convoy-ambush-response",
    title: "Convoy ambush response",
    freeText: {
      mission_statement:
        "Quick Reaction Force (Charlie Company) is tasked to respond to a logistics convoy ambushed " +
        "on Route Falcon at kilometer marker 47, break contact for the convoy, and prevent the " +
        "ambushing element from consolidating gains, within a 20-minute response window from first " +
        "report.",
      terrain_description:
        "Route Falcon runs through a shallow wadi flanked by rocky high ground on both sides for " +
        "approximately 3km - a known ambush-prone stretch. One helicopter landing zone 6km north at a " +
        "disused airstrip. Mobile phone coverage is patchy in the wadi itself.",
      force_composition_notes:
        "Friendly: Quick Reaction Force of one mechanized infantry company, medevac helicopter on " +
        "15-minute alert; the ambushed convoy is 12 vehicles with a 20-person security detachment " +
        "already engaged. Estimated hostile: platoon-sized ambush element (20-30), likely with " +
        "rocket-propelled grenades and at least one crew-served weapon based on the initial contact " +
        "report.",
      constraints_roe:
        "Return fire only against identified firing positions - the wadi has scattered herding " +
        "families historically present in daylight hours. Close air support release authority held " +
        "at brigade, not delegable to company level for this operation. Recovery of damaged vehicles " +
        "takes priority over pursuit if the two conflict.",
      additional_notes:
        "This is the third ambush on this stretch of Route Falcon in two weeks; the pattern suggests " +
        "a static rather than opportunistic threat.",
    },
    scenario: sampleScenario("convoy-ambush-response", "EX FALCON RESPONSE (SAMPLE)"),
  },
];

const AR: SampleScenario[] = [
  {
    id: "urban-cordon-search",
    title: "تطويق وتفتيش حضري",
    freeText: {
      mission_statement:
        "تُكلَّف الكتيبة الأولى بتطويق وتفتيش الحي القديم في كاستيلوم لتحديد موقع واعتقال أحد قادة " +
        "الخلية المتمردة من المستوى المتوسط، الذي يُعتقد أنه يختبئ بين السكان المدنيين، وذلك خلال " +
        "نافذة زمنية مدتها 12 ساعة، مع تقليل التعطيل على السوق المحلي الذي يفتح أبوابه الساعة 0600.",
      terrain_description:
        "مبانٍ حجرية كثيفة ومتفاوتة الارتفاع على شبكة شوارع ضيقة من الطراز القديم؛ ثلاثة محاور تسمح " +
        "بحركة المركبات من الشمال والشرق، ويحد الجانب الجنوبي نهر يُعبر عبر جسر مشاة واحد فقط. خطوط " +
        "الرؤية من الأسطح تهيمن على الساحة المركزية. توجد أنفاق مرافق تحت الأرض تربط عدة أحياء وهي " +
        "غير مُخططة بالكامل.",
      force_composition_notes:
        "القوات الصديقة: كتيبة مشاة (منقوصة)، فصيلة شرطة عسكرية، فريق تخلص من الذخائر المتفجرة، ضابط " +
        "اتصال محلي. القوات المعادية المقدَّرة: خلية من 8-12 فردًا، يُرجَّح تسلحهم بأسلحة خفيفة، مع " +
        "احتمال وجود عبوات ناسفة مرتجلة عند نقاط الاختناق. عدد السكان المدنيين في منطقة البحث نحو " +
        "4000 نسمة، وبائعو السوق حاضرون منذ الساعة 0500.",
      constraints_roe:
        "يُحظر الدخول القسري إلى المواقع الدينية دون إذن قضائي ومرافقة الشرطة المحلية. يلزم التحقق " +
        "الإيجابي من الهوية قبل أي استخدام للقوة. لا يمكن فرض حظر التجول قبل الساعة 2200. تُقيَّد حركة " +
        "المركبات في الشوارع التي يقل عرضها عن 4 أمتار.",
      additional_notes:
        "تمتلك الشرطة المحلية شبكة مخبرين جزئية لكن الثقة محدودة بعد عملية سابقة لم تسر بشكل جيد؛ " +
        "يُتوقع أن تكون المعلومات ناقصة أو متأخرة عمدًا.",
    },
    scenario: sampleScenario("urban-cordon-search", "تمرين كاستيلوم (نموذج)"),
  },
  {
    id: "opposed-river-crossing",
    title: "عبور نهري تحت اشتباك",
    freeText: {
      mission_statement:
        "تُكلَّف اللواء المدرع الثاني بإنشاء رأس جسر عبر نهر ساربا عند موقع العبور دلتا لتمكين القوات " +
        "اللاحقة من الاستيلاء على تقاطع الطرق في فارتيك خلال 36 ساعة، في ظل تقارير عن إعادة انتشار " +
        "لواء آلي معادٍ لمنازعة العبور.",
      terrain_description:
        "عرض النهر بين 180-220 مترًا بتيار معتدل، وجسر طريق سريع تالف (محدود الحمولة) وموقعا خوض " +
        "صالحان فقط عند انخفاض منسوب المياه. الضفة الشرقية أرض زراعية مفتوحة قليلة الغطاء؛ الضفة " +
        "الغربية ترتفع إلى أراضٍ حرجية مرتفعة تشرف على مواقع العبور. تشير توقعات الطقس إلى أمطار قد " +
        "ترفع منسوب النهر خلال 24 ساعة.",
      force_composition_notes:
        "القوات الصديقة: لواء مدرع، سرية هندسة مع معدات جسور، طيران هجومي جاهز عند الطلب. القوات " +
        "المعادية المقدَّرة: لواء مشاة آلي (نحو 1500-2000 فرد)، مدفعية عضوية، ومن المحتمل وجود مهندسي " +
        "عوائق في الموقع بالفعل.",
      constraints_roe:
        "يُحظر استخدام الجسر الرئيسي في موجة الهجوم الأولى (سلامته الإنشائية غير مؤكدة). تُقيَّد " +
        "النيران غير المباشرة على بلدة فارتيك بمواقع إطلاق نار معادية مرصودة فقط - فهي ما زالت مأهولة. " +
        "الدعم الجوي يخضع لقائمة حظر ضرب تشمل منشأة الطاقة الكهرومائية أعلى النهر.",
      additional_notes:
        "وجَّهت القيادة الأعلى بإتمام العبور قبل وصول الأمطار؛ الجدول الزمني أكثر تقييدًا من الوضع " +
        "المعادي نفسه.",
    },
    scenario: sampleScenario("opposed-river-crossing", "تمرين عبور فارديس (نموذج)"),
  },
  {
    id: "convoy-ambush-response",
    title: "الاستجابة لكمين على قافلة",
    freeText: {
      mission_statement:
        "تُكلَّف قوة الرد السريع (السرية سي) بالاستجابة لكمين تعرضت له قافلة لوجستية على طريق فالكون " +
        "عند نقطة الكيلومتر 47، وفك الاشتباك عن القافلة، ومنع العنصر المُغِير من تعزيز مكاسبه، خلال " +
        "نافذة استجابة مدتها 20 دقيقة من أول بلاغ.",
      terrain_description:
        "يمر طريق فالكون عبر وادٍ ضحل تحيط به مرتفعات صخرية من الجانبين لمسافة نحو 3 كم - وهو مقطع " +
        "معروف بتعرضه للكمائن. توجد منطقة هبوط للمروحيات على بعد 6 كم شمالًا عند مدرج مهجور. تغطية " +
        "الهاتف المحمول متقطعة داخل الوادي نفسه.",
      force_composition_notes:
        "القوات الصديقة: قوة رد سريع من سرية مشاة آلية، مروحية إخلاء طبي في حالة تأهب خلال 15 دقيقة، " +
        "والقافلة المُهاجَمة تضم 12 مركبة مع مفرزة أمن من 20 فردًا مُشتبكة بالفعل. القوات المعادية " +
        "المقدَّرة: عنصر كمين بحجم فصيلة (20-30 فردًا)، يُرجَّح تسلحه بقاذفات صواريخ محمولة وسلاح " +
        "جماعي واحد على الأقل بحسب تقرير الاشتباك الأولي.",
      constraints_roe:
        "يقتصر رد النيران على مواقع إطلاق نار محددة الهوية - إذ يتردد على الوادي عائلات رعي متفرقة " +
        "نهارًا تاريخيًا. صلاحية الإفراج عن الدعم الجوي القريب محصورة بمستوى اللواء ولا يمكن تفويضها " +
        "لمستوى السرية في هذه العملية. استعادة المركبات المتضررة لها الأولوية على الملاحقة في حال " +
        "تعارضهما.",
      additional_notes:
        "هذا هو الكمين الثالث على هذا المقطع من طريق فالكون خلال أسبوعين؛ ويشير النمط إلى تهديد ثابت " +
        "وليس عرضيًا.",
    },
    scenario: sampleScenario("convoy-ambush-response", "تمرين استجابة فالكون (نموذج)"),
  },
];

export const SAMPLE_SCENARIOS: Record<UiLanguage, SampleScenario[]> = { en: EN, ar: AR };
