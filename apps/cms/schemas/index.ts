import { Author } from './author';
import { BlogCategory } from './blog/category';

import { BlogPost } from './blog/post';
import { BlogTag } from './blog/tag';

import { Divider } from './long-form/divider';
import { ImageWithAlt } from './long-form/image-with-alt';
import { LongFormBlockContent } from './long-form/long-form-content';
import { YouTubeEmbed } from './long-form/youtube-embed';
import { PodcastAudioClip } from './podcast/audio-clip';
import { PodcastEpisode } from './podcast/episode';
import { PodcastFeed } from './podcast/feed';
import { PodcastShowSegment } from './podcast/segment';
import { PodcastShow } from './podcast/show';
import { StagesObject } from './util/stages';
import { SimpleContent } from './long-form/simple-content';
import { BlockQuote, Epigraph } from './long-form/block-quote';
import { CodeBlock } from "./long-form/code-block";

export const schemaTypes = [
  Author,

  BlogPost,
  BlogCategory,
  BlogTag,

  SimpleContent,
  LongFormBlockContent,

  Epigraph,
  BlockQuote,
  ImageWithAlt,
  Divider,
  YouTubeEmbed,
  CodeBlock,

  PodcastShow,
  PodcastFeed,
  PodcastAudioClip,
  PodcastShowSegment,
  PodcastEpisode,

  StagesObject,
];
