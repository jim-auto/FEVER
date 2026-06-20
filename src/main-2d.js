import './styles/main.css';
import { Game2D } from './2d/Game2D.js';

const canvas = document.getElementById('game-canvas');
const uiRoot = document.getElementById('ui-root');
const demo = new URLSearchParams(location.search).has('screenshot')
  || location.hash === '#screenshot';

const game = new Game2D(canvas, uiRoot);
game.start(demo ? { demo: true } : undefined);
