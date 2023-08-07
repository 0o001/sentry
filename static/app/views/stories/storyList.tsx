import {ComponentProps} from 'react';
import styled from '@emotion/styled';

import Link from 'sentry/components/links/link';
import {space} from 'sentry/styles/space';
import {useLocation} from 'sentry/utils/useLocation';
import type {StoriesQuery} from 'sentry/views/stories/types';

type DirContent = Record<string, unknown>;

interface Props extends ComponentProps<'div'> {
  files: string[];
}

export default function StoryList({files, style}: Props) {
  const tree = toTree(files);

  return (
    <div style={style}>
      <FolderContent path="" content={tree} />
    </div>
  );
}

function FolderContent({path, content}: {content: DirContent; path: string}) {
  const location = useLocation<StoriesQuery>();
  const currentFile = location.query.name;

  return (
    <UnorderedList>
      {Object.entries(content).map(([name, children]) => {
        const childContent = children as DirContent;
        const childPath = toPath(path, name);

        if (Object.keys(childContent).length === 0) {
          const isCurrent = childPath === currentFile ? true : undefined;
          const to = `/stories/?name=${childPath}`;
          return (
            <ListItem key={name} aria-current={isCurrent}>
              <FolderLink to={to}>{name}</FolderLink>
            </ListItem>
          );
        }

        return (
          <ListItem key={name}>
            <Folder open>
              <FolderName>{name}</FolderName>
              <FolderContent path={childPath} content={childContent} />
            </Folder>
          </ListItem>
        );
      })}
    </UnorderedList>
  );
}

function toTree(files: string[]) {
  const root = {};
  for (const file of files) {
    const parts = file.split('/');
    let tree = root;
    for (const part of parts) {
      if (!(part in tree)) {
        tree[part] = {};
      }
      tree = tree[part];
    }
  }
  return root;
}

function toPath(path: string, name: string) {
  return [path, name].filter(Boolean).join('/');
}

const UnorderedList = styled('ul')`
  margin: 0;
  padding: 0;
  list-style: none;
`;
const ListItem = styled('li')`
  position: relative;

  &[aria-current] {
    background: ${p => p.theme.blue300};
    color: ${p => p.theme.white};
    font-weight: bold;
  }
  &[aria-current] a:before {
    background: ${p => p.theme.blue300};
    content: '';
    left: -100%;
    position: absolute;
    right: 0;
    top: 0;
    z-index: -1;
    bottom: 0;
  }
`;

const Folder = styled('details')`
  cursor: pointer;
  padding-left: ${space(1.5)};
  position: relative;

  &:before {
    content: '⏵';
    position: absolute;
    left: 0;
    top: 0;
  }
  &[open]:before {
    content: '⏷';
  }
`;

const FolderName = styled('summary')`
  padding: ${space(0.25)};

  color: inherit;
  &:hover {
    background: ${p => p.theme.blue100};
    color: inherit;
  }
`;

const FolderLink = styled(Link)`
  display: block;
  padding: ${space(0.25)};

  color: inherit;
  &:hover {
    background: ${p => p.theme.blue100};
    color: inherit;
  }
`;
