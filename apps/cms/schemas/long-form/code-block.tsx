import { defineType, defineField } from 'sanity';

export const CodeBlock = defineType({
  name: 'codeBlock',
  title: 'Code Block',
  type: 'object',
  fields: [
    defineField({
      type: 'code',
      name: 'code',
      title: 'Code',
      options: {
        language: 'typescript',
        languageAlternatives: [
          {title: 'TypeScript', value: 'typescript'},
          {title: 'JavaScript', value: 'javascript'},
          {title: 'HTML', value: 'html'},
          {title: 'CSS', value: 'css'},
          {title: 'Python', value: 'python'},
          {title: 'Ruby', value: 'ruby'},
          {title: 'Go', value: 'golang'},
          {title: 'XML', value: 'xml'},
          {title: 'JSON', value: 'javascript'},
          {title: 'YAML', value: 'yaml'},
          {title: 'Markdown', value: 'markdown'},
          {title: 'SQL', value: 'sql'},
          {title: 'Shell', value: 'sh'},

        ],
        withFilename: true,
      },
      // @ts-ignore
      codegen: { required: true },
      validation: Rule => Rule.required(),
    })
  ],
});
