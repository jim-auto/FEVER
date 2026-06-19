/** 受付の問い — どの部分が来院したか */
export const RECEPTION_CHOICES = [
  {
    id: 'body',
    label: '身体',
    epilogue: '身体がストレッチャーで運ばれた。窓の外では、街と病院がまだゆっくり動いている。世界は、消えない。',
    ticket: { location: '0号室' },
  },
  {
    id: 'name',
    label: '名前',
    epilogue: '名前が呼ばれた。群衆の中の誰かが立ち上がる。自分は無記名のまま、誰にも止められず病院内を歩く。',
    ticket: { name: '不在', location: '病院・内部' },
  },
  {
    id: 'temperature',
    label: '体温',
    epilogue: '体温計だけが運ばれた。身体は楽になった。熱が人型の影となって、廊下を歩き始める。',
    ticket: { temperature: '分離', companion: '熱の残像' },
  },
  {
    id: 'purpose',
    label: '目的',
    epilogue: '「病院へ行く」が受付へ運ばれ、消えた。初めて、目的のない自由な時間が与えられる——それでも、足は前に出る。',
    ticket: { destination: '——' },
    hideObjective: true,
  },
  {
    id: 'companion',
    label: '付き添い',
    epilogue: '自分は患者ではなく、付き添いとして残った。誰か——まだ見ぬ自分——が治療を受けている。待合室の椅子が、少し温かい。',
    ticket: { status: '付き添い', location: '待合室' },
  },
];
