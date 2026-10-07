// Global progressive-enhancement bundle. Every feature guards on the
// presence of its DOM hooks and the typed settings rendered as data
// attributes by the layouts, so pages only pay for what they use.
import { initScrollOffset } from './scroll-offset';
import { initDrawer } from './drawer';
import { initVideos } from './videos';
import { initQuiz } from './quiz';
import { initDefinitions } from './definitions';
import { initTables } from './tables';
import { initFootnotePopups } from './footnote-popups';
import { initSlides } from './slides';
import { initAccordion } from './accordion';
import { initCopy } from './copy';
import { initShare } from './share';
import { initSelect } from './select';
import { initSvgInject } from './svg-inject';
import { initBookmarks } from './bookmarks';
import { initReadingProgress } from './reading-progress';
import { initHeadings } from './headings';
import { initSearchHighlight } from './search-highlight';
import { initImageTitles } from './image-titles';

initScrollOffset();
initDrawer();
initVideos();
initQuiz();
initDefinitions();
initTables();
initFootnotePopups();
initSlides();
initAccordion();
initCopy();
initShare();
initSelect();
initSvgInject();
initBookmarks();
initReadingProgress();
initHeadings();
initSearchHighlight();
initImageTitles();
