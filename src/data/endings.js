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
  {
    id: 'appointment',
    label: '予約時刻',
    epilogue: '予約票だけが先に回診室へ入った。自分は待合で番号を呼ばれるが、時刻の欄はずっと空白のままだ。',
    ticket: { appointment: '先着', location: '待合・番号待ち' },
  },
  {
    id: 'reason',
    label: '来院理由',
    epilogue: '「発熱」という言葉だけが診察室に運ばれた。身体は外に置き去りにされ、理由だけがベッドに横たわっている。',
    ticket: { reason: '分離', status: '理由のみ' },
  },
];

export const SILENCE_ENDING = {
  id: 'silence',
  label: '沈黙',
  epilogue: '何も答えなかった。受付はうなずき、空白の患者票をファイルへ滑らせた。病院は、言葉のない来院も受け入れる。',
  ticket: { name: '——', reason: '——', location: '受付・保留' },
};

export const MEMORY_ENDING = {
  id: 'memory',
  label: '記憶',
  epilogue: '「途中で目を覚ました場所」だけが来院したと記録された。身体はまだここにいる。記憶だけが、先に治療を受けている。',
  ticket: { location: '再解釈地点', status: '記憶' },
  requiresReinterpret: 2,
};

export function getReceptionChoices(state) {
  const choices = [...RECEPTION_CHOICES];
  if (state.reinterpretCount >= MEMORY_ENDING.requiresReinterpret) {
    choices.push(MEMORY_ENDING);
  }
  return choices;
}

export function resolveEnding(choiceId) {
  if (choiceId === 'silence') return SILENCE_ENDING;
  return RECEPTION_CHOICES.find((c) => c.id === choiceId)
    ?? (choiceId === 'memory' ? MEMORY_ENDING : null);
}
