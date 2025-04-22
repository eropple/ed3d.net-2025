import { BlockListDefinition, BlockStyleDefinition, defineField } from 'sanity';

export const NORMAL_BLOCK_STYLE: BlockStyleDefinition =
  { title: 'Normal', value: 'normal' };

export const H2_BLOCK_STYLE: BlockStyleDefinition =
  { title: 'H2', value: 'h2', component: (props) => <h2>{props.children}</h2> };

export const H3_BLOCK_STYLE: BlockStyleDefinition =
  { title: 'H3', value: 'h3', component: (props) => <h3>{props.children}</h3> };

export const CENTERED_BLOCK_STYLE: BlockStyleDefinition =
  { title: 'Centered', value: 'centered', component: (props) => <p style={{ textAlign: 'center' }}>{props.children}</p> };

export const BULLET_LIST_STYLE: BlockListDefinition =
  { title: 'Bullet', value: 'bullet' };

export const NUMBER_LIST_STYLE: BlockListDefinition =
  { title: 'Number', value: 'number' };

export const NORMAL_LISTS = [ BULLET_LIST_STYLE, NUMBER_LIST_STYLE ];



export const STRONG_DECORATOR = { title: 'Strong', value: 'strong' };
export const EMPHASIS_DECORATOR = { title: 'Emphasis', value: 'em' };
export const CODE_DECORATOR = { title: 'Code', value: 'code' };
export const UNDERLINE_DECORATOR = { title: 'Underline', value: 'underline' };
export const STRIKE_DECORATOR = { title: 'Strike', value: 'strike-through' };

export const NORMAL_DECORATORS = [
  STRONG_DECORATOR,
  EMPHASIS_DECORATOR,
  CODE_DECORATOR,
  UNDERLINE_DECORATOR,
  STRIKE_DECORATOR,
];

export const LINK_ANNOTATION = {
  name: 'link',
  type: 'object',
  title: 'URL',
  fields: [
    defineField({
      name: 'href',
      title: 'URL',
      type: 'url',
    }),
  ],
};
