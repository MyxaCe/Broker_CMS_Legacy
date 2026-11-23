import * as migration_20260725_154032_init_multitenant from './20260725_154032_init_multitenant';
import * as migration_20260725_163338_cabinet_home from './20260725_163338_cabinet_home';
import * as migration_20260727_095512_allow_list from './20260727_095512_allow_list';
import * as migration_20261119_145051_site_languages from './20261119_145051_site_languages';
import * as migration_20261119_155549_live_params from './20261119_155549_live_params';
import * as migration_20261121_120722_platform_instruments from './20261121_120722_platform_instruments';
import * as migration_20261121_133912_site_instruments from './20261121_133912_site_instruments';
import * as migration_20261122_133540_video_links from './20261122_133540_video_links';
import * as migration_20261122_134739_legal_entity from './20261122_134739_legal_entity';
import * as migration_20261122_135545_system_status_live from './20261122_135545_system_status_live';
import * as migration_20261122_140507_articles_editor from './20261122_140507_articles_editor';
import * as migration_20261122_140600_article_categories from './20261122_140600_article_categories';
import * as migration_20261122_140700_academy_articles from './20261122_140700_academy_articles';
import * as migration_20261123_090000_education_course from './20261123_090000_education_course';

export const migrations = [
  {
    up: migration_20260725_154032_init_multitenant.up,
    down: migration_20260725_154032_init_multitenant.down,
    name: '20260725_154032_init_multitenant',
  },
  {
    up: migration_20260725_163338_cabinet_home.up,
    down: migration_20260725_163338_cabinet_home.down,
    name: '20260725_163338_cabinet_home',
  },
  {
    up: migration_20260727_095512_allow_list.up,
    down: migration_20260727_095512_allow_list.down,
    name: '20260727_095512_allow_list',
  },
  {
    up: migration_20261119_145051_site_languages.up,
    down: migration_20261119_145051_site_languages.down,
    name: '20261119_145051_site_languages',
  },
  {
    up: migration_20261119_155549_live_params.up,
    down: migration_20261119_155549_live_params.down,
    name: '20261119_155549_live_params',
  },
  {
    up: migration_20261121_120722_platform_instruments.up,
    down: migration_20261121_120722_platform_instruments.down,
    name: '20261121_120722_platform_instruments',
  },
  {
    up: migration_20261121_133912_site_instruments.up,
    down: migration_20261121_133912_site_instruments.down,
    name: '20261121_133912_site_instruments',
  },
  {
    up: migration_20261122_133540_video_links.up,
    down: migration_20261122_133540_video_links.down,
    name: '20261122_133540_video_links',
  },
  {
    up: migration_20261122_134739_legal_entity.up,
    down: migration_20261122_134739_legal_entity.down,
    name: '20261122_134739_legal_entity',
  },
  {
    up: migration_20261122_135545_system_status_live.up,
    down: migration_20261122_135545_system_status_live.down,
    name: '20261122_135545_system_status_live',
  },
  {
    up: migration_20261122_140507_articles_editor.up,
    down: migration_20261122_140507_articles_editor.down,
    name: '20261122_140507_articles_editor',
  },
  {
    up: migration_20261122_140600_article_categories.up,
    down: migration_20261122_140600_article_categories.down,
    name: '20261122_140600_article_categories',
  },
  {
    up: migration_20261122_140700_academy_articles.up,
    down: migration_20261122_140700_academy_articles.down,
    name: '20261122_140700_academy_articles',
  },
  {
    up: migration_20261123_090000_education_course.up,
    down: migration_20261123_090000_education_course.down,
    name: '20261123_090000_education_course',
  },
];
