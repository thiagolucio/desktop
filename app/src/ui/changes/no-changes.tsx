import * as React from 'react'

import { encodePathAsUrl } from '../../lib/path'
import { revealInFileManager } from '../../lib/app-shell'
import { Repository } from '../../models/repository'
import { LinkButton } from '../lib/link-button'
import { enableNewNoChangesBlankslate } from '../../lib/feature-flag'
import { Button } from '../lib/button'
import classNames = require('classnames')
import { MenuIDs } from '../../main-process/menu'
import { IMenu, MenuItem } from '../../models/app-menu'
import memoizeOne from 'memoize-one'
import { getPlatformSpecificNameOrSymbolForModifier } from '../../lib/menu-item'

const BlankSlateImage = encodePathAsUrl(
  __dirname,
  'static/empty-no-file-selected.svg'
)

const PaperStackImage = encodePathAsUrl(__dirname, 'static/paper-stack.svg')

interface INoChangesProps {
  readonly repository: Repository

  /**
   * The top-level application menu item.
   */
  readonly appMenu: IMenu | undefined
}

// interface INoChangesAction {
//   readonly title: string
//   readonly description: string
//   readonly actionLabel: string
//   readonly execute: (props: INoChangesProps) => void
// }

// const actions =

interface IMenuItemInfo {
  readonly label: string
  readonly acceleratorKeys: ReadonlyArray<string>
  readonly parentMenuLabels: ReadonlyArray<string>
}

function getItemAcceleratorKeys(item: MenuItem) {
  if (item.type === 'separator' || item.type === 'submenuItem') {
    return []
  }

  if (item.accelerator === null) {
    return []
  }

  return item.accelerator
    .split('+')
    .map(getPlatformSpecificNameOrSymbolForModifier)
}

function buildMenuItemInfoMap(
  menu: IMenu,
  map = new Map<string, IMenuItemInfo>(),
  parent?: IMenuItemInfo
): ReadonlyMap<string, IMenuItemInfo> {
  for (const item of menu.items) {
    const infoItem: IMenuItemInfo = {
      label: item.type === 'separator' ? '-' : item.label,
      acceleratorKeys: getItemAcceleratorKeys(item),
      parentMenuLabels:
        parent === undefined ? [] : [parent.label, ...parent.parentMenuLabels],
    }

    map.set(item.id, infoItem)

    if (item.type === 'submenuItem') {
      buildMenuItemInfoMap(item.menu, map, infoItem)
    }
  }

  return map
}

/** The component to display when there are no local changes. */
export class NoChanges extends React.Component<INoChangesProps, {}> {
  private getMenuInfoMap = memoizeOne((menu: IMenu | undefined) =>
    menu === undefined
      ? new Map<string, IMenuItemInfo>()
      : buildMenuItemInfoMap(menu)
  )

  private getMenuItemInfo(menuItemId: MenuIDs): IMenuItemInfo | undefined {
    return this.getMenuInfoMap(this.props.appMenu).get(menuItemId)
  }

  private renderClassicBlankSlate() {
    const opener = __DARWIN__
      ? 'Finder'
      : __WIN32__
      ? 'Explorer'
      : 'your File Manager'
    return (
      <div className="panel blankslate" id="no-changes">
        <img src={BlankSlateImage} className="blankslate-image" />
        <div>No local changes</div>

        <div>
          Would you like to{' '}
          <LinkButton onClick={this.open}>open this repository</LinkButton> in{' '}
          {opener}?
        </div>
      </div>
    )
  }

  private renderNewNoChangesBlankSlate() {
    const className = classNames({
      // This is unneccessary but serves as a reminder to drop
      // the ng class from here and change the scss when we
      // remove the feature flag.
      ng: enableNewNoChangesBlankslate(),
    })

    return (
      <div id="no-changes" className={className}>
        <div className="content">
          <div className="header">
            <div className="text">
              <h1>No local changes</h1>
              <p>
                You have no uncommitted changes in your repository! Here’s some
                friendly suggestions for what to do next.
              </p>
            </div>
            <img src={PaperStackImage} className="blankslate-image" />
          </div>
          {this.renderActions()}
        </div>
      </div>
    )
  }

  private renderAction(
    title: string,
    description: string | JSX.Element,
    buttonText: string,
    onClick: () => void,
    className?: string
  ) {
    const cn = classNames('action', className)
    return (
      <div className={cn}>
        <div className="text-wrapper">
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <Button onClick={onClick}>{buttonText}</Button>
      </div>
    )
  }

  private getPlatformFileManagerName() {
    if (__DARWIN__) {
      return 'Finder'
    } else if (__WIN32__) {
      return 'Explorer'
    }
    return 'Your File Manager'
  }

  private renderDiscoverabilityElements(menuItem: IMenuItemInfo) {
    const parentMenusText = menuItem.parentMenuLabels.join(' -> ')
    const keyboardShortcut = menuItem.acceleratorKeys.map((k, i) => (
      <kbd key={k + i}>{k}</kbd>
    ))

    return (
      <>
        {parentMenusText} menu or {keyboardShortcut}
      </>
    )
  }

  private renderShowInFinderAction() {
    const fileManager = this.getPlatformFileManagerName()
    const menuItem = this.getMenuItemInfo('open-working-directory')

    if (menuItem === undefined) {
      log.error(`Could not find matching menu item for ShowInFinderAction`)
      return null
    }

    return this.renderAction(
      `View the files in your repository in ${fileManager}`,
      this.renderDiscoverabilityElements(menuItem),
      `Show in ${fileManager}`,
      () => {}
    )
  }

  private renderActions() {
    return (
      <div className="actions">
        {this.renderShowInFinderAction()}
        {this.renderShowInFinderAction()}
      </div>
    )
  }

  public render() {
    if (enableNewNoChangesBlankslate()) {
      return this.renderNewNoChangesBlankSlate()
    }

    return this.renderClassicBlankSlate()
  }

  private open = () => {
    revealInFileManager(this.props.repository, '')
  }
}
