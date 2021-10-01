import _ from 'lodash';
import NestedComponent from '../_classes/nested/NestedComponent';
import * as FormioUtils from '../../utils/utils';
import { fastCloneDeep } from '../../utils/utils';

export default class TabsComponent extends NestedComponent {
  static schema(...extend) {
    return NestedComponent.schema({
      label: 'Tabs',
      type: 'tabs',
      input: false,
      key: 'tabs',
      persistent: false,
      tableView: false,
      components: [
        {
          label: 'Tab 1',
          key: 'tab1',
          components: [],
        },
      ],
      verticalLayout: false,
    }, ...extend);
  }

  static get builderInfo() {
    return {
      title: 'Tabs',
      group: 'layout',
      icon: 'folder-o',
      weight: 50,
      documentation: '/userguide/#tabs',
      schema: TabsComponent.schema(),
    };
  }

  get defaultSchema() {
    return TabsComponent.schema();
  }

  get schema() {
    const schema = super.schema;
    // We need to clone this because the builder uses the "components" reference and this would reset that reference.
    const components = _.cloneDeep(this.component.components);
    schema.components = components.map((tab, index) => {
      tab.components = this.tabs[index].map((component) => component.schema);
      return tab;
    });

    return schema;
  }

  get tabKey() {
    return `tab-${this.key}`;
  }

  get tabLikey() {
    return `tabLi-${this.key}`;
  }

  get tabLinkKey() {
    return `tabLink-${this.key}`;
  }

  constructor(...args) {
    super(...args);
    this.currentTab = 0;
    this.noField = true;
  }

  checkComponentConditions(data, flags, row) {
    if (!super.checkComponentConditions(data, flags, row)) {
      return false;
    }
    const oldTabItemComponents = _.cloneDeep(this.tabItemComponents);
    this.createTabs(false);
    if (!_.isEqual(oldTabItemComponents, this.tabItemComponents)) {
      this.redraw();
    }
    return true;
  }

  init() {
    this.components = [];
    this.createTabs();
  }

  createTabs(init=true) {
    this.tabItemComponents = this.tabItemComponents || [];
    this.tabs = this.tabs || [];
    const currentTabItemComponent = this.tabItemComponents[this.currentTab];
    let index = 0;
    for (const tabItemComponent of this.component.components) {
      const hasCondition = FormioUtils.hasCondition(tabItemComponent);
      if (this.builderMode || this.previewMode || hasCondition && FormioUtils.checkCondition(
        tabItemComponent,
        this.data,
        this.rootValue,
        this.root ? this.root._form : {},
        this
      ) || !hasCondition && !tabItemComponent.hidden) {
        if (init || this.tabItemComponents[index] !== tabItemComponent) {
          this.tabItemComponents[index] = tabItemComponent;
          if (!tabItemComponent.components) {
            tabItemComponent.components = [];
          }
          this.tabs[index] = tabItemComponent.components.map(comp => {
            const component = this.createComponent(comp);
            component.tab = index;
            return component;
          });
        }
        index++;
      }
    }
    if (this.tabItemComponents.length > index) {
      this.tabItemComponents.splice(index);
      this.tabs.splice(index);
    }
    if (currentTabItemComponent) {
      this.currentTab = this.tabItemComponents.indexOf(currentTabItemComponent);
      if (this.currentTab === -1) {
        this.currentTab = 0;
      }
    }
  }

  render() {
    return super.render(this.renderTemplate('tab', {
      tabKey: this.tabKey,
      tabLikey: this.tabLikey,
      tabLinkKey: this.tabLinkKey,
      currentTab: this.currentTab,
      tabItemComponents: this.tabItemComponents,
      tabComponents: this.tabs.map(tab => this.renderComponents(tab))
    }, (this.options.flatten || this.options.pdf ? 'flat' : null)));
  }

  attach(element) {
    this.loadRefs(element, { [this.tabLinkKey]: 'multiple', [this.tabKey]: 'multiple', [this.tabLikey]: 'multiple' });
    ['change', 'error'].forEach(event => this.on(event, this.handleTabsValidation.bind(this)));
    const superAttach = super.attach(element);
    this.refs[this.tabLinkKey].forEach((tabLink, index) => {
      this.addEventListener(tabLink, 'click', (event) => {
        event.preventDefault();
        this.setTab(index);
      });
    });
    this.refs[this.tabKey].forEach((tab, index) => {
      this.attachComponents(tab, this.tabs[index], this.component.components[index].components);
    });
    return superAttach;
  }

  detachLogic() {
    super.detachLogic();
    for (const tabItemComponent of this.component.components) {
      if (!tabItemComponent.logic) {
        continue;
      }
      for (const logic of tabItemComponent.logic) {
        if (logic.trigger.type !== 'event') {
          continue;
        }
        const event = this.interpolate(logic.trigger.event);
        this.off(event);
      }
    }
  }

  fieldLogic(data, row) {
    data = data || this.rootValue;
    row = row || this.data;
    const logics = this.logic;
    // If there aren't logic, don't go further.
    if (logics.length === 0 && (!this.originalComponent.components || !this.originalComponent.components.some(c => c.logic && c.logic.length > 0))) {
      return;
    }

    const newComponent = fastCloneDeep(this.originalComponent);

    let changed = logics.reduce((changed, logic) => {
      const result = FormioUtils.checkTrigger(
        newComponent,
        logic.trigger,
        row,
        data,
        this.root ? this.root._form : {},
        this,
      );

      return (result ? this.applyActions(newComponent, logic.actions, result, row, data) : false) || changed;
    }, false);

    for (const tabItemComponent of newComponent.components) {
      if (!tabItemComponent.logic) {
        continue;
      }
      tabItemComponent.logic.forEach((logic) => {
        const result = FormioUtils.checkTrigger(
          tabItemComponent,
          logic.trigger,
          row,
          data,
          this.root ? this.root._form : {},
          this,
        );
        changed = (result ? this.applyActions(tabItemComponent, logic.actions, result, row, data) : false) || changed;
      });
    }

    // If component definition changed, replace and mark as changed.
    if (!_.isEqual(this.component, newComponent)) {
      this.component = newComponent;
      changed = true;
      const disabled = this.shouldDisabled;
      // Change disabled state if it has changed
      if (this.disabled !== disabled) {
        this.disabled = disabled;
      }
    }

    return changed;
  }

  attachLogic() {
    // Do not attach logic during builder mode.
    if (this.builderMode) {
      return;
    }
    super.attachLogic();
    for (let i = 0; i < this.component.components.length; i++) {
      let tabItemComponent = this.component.components[i];
      if (!tabItemComponent.logic) {
        continue;
      }
      for (const logic of tabItemComponent.logic) {
        if (logic.trigger.type !== 'event') {
          continue;
        }
        this.on(event, (...args) => {
          const newTabItemComponent = fastCloneDeep(tabItemComponent);
          if (this.applyActions(newTabItemComponent, logic.actions, args)) {
            // If component definition changed, replace it.
            tabItemComponent = this.component.components[i];
            if (!_.isEqual(tabItemComponent, newTabItemComponent)) {
              this.component.components[this.component.components.indexOf(tabItemComponent)] = newTabItemComponent;
              this.redraw();
            }
          }
        }, true);
      }
    }
  }

  detach(all) {
    super.detach(all);
  }

  /**
   * Set the current tab.
   *
   * @param index
   */
  setTab(index) {
    if (
      !this.tabs ||
      !this.tabs[index] ||
      !this.refs[this.tabKey] ||
      !this.refs[this.tabKey][index] ||
      this.tabItemComponents[index].disabled
    ) {
      return;
    }
    this.currentTab = index;

    _.each(this.refs[this.tabKey], (tab) => {
      this.removeClass(tab, 'formio-tab-panel-active');
      tab.style.display = 'none';
    });
    this.addClass(this.refs[this.tabKey][index], 'formio-tab-panel-active');
    this.refs[this.tabKey][index].style.display = 'block';

    _.each(this.refs[this.tabLinkKey], (tabLink, tabIndex) => {
      if (this.refs[this.tabLinkKey][tabIndex]) {
        this.removeClass(tabLink, 'formio-tab-link-active');
      }
      if (this.refs[this.tabLikey][tabIndex]) {
        this.removeClass(this.refs[this.tabLikey][tabIndex], 'formio-tab-link-container-active');
      }
    });
    if (this.refs[this.tabLikey][index]) {
      this.addClass(this.refs[this.tabLikey][index], 'formio-tab-link-container-active');
    }
    if (this.refs[this.tabLinkKey][index]) {
      this.addClass(this.refs[this.tabLinkKey][index], 'formio-tab-link-active');
    }
    this.triggerChange();
  }

  beforeFocus(component) {
    if ('beforeFocus' in this.parent) {
      this.parent.beforeFocus(this);
    }
    const tabIndex = this.tabs.findIndex((tab) => {
      return tab.some((comp) => comp === component);
    });
    if (tabIndex !== -1 &&  this.currentTab !== tabIndex) {
      this.setTab(tabIndex);
    }
  }

  setErrorClasses(elements, dirty, hasErrors, hasMessages, element = this.element) {
    if (this.component.modalEdit) {
      super.setErrorClasses(elements, dirty, hasErrors, hasMessages, element);
    }

    elements.forEach((element) => {
      this.addClass(element, 'is-invalid');

      if (element.getAttribute('ref') !== 'openModal') {
        if (this.options.highlightErrors) {
          this.addClass(element, 'tab-error');
        }
        else {
          this.addClass(element, 'has-error');
        }
      }
    });
  }

  clearErrorClasses(elements) {
    if (this.component.modalEdit) {
      const element = Array.isArray(elements) || elements instanceof NodeList ? this.element : elements;
      super.clearErrorClasses(element);
    }

    elements = Array.isArray(elements) || elements instanceof NodeList ? elements : [elements];

    elements.forEach((element) => {
      this.removeClass(element, 'is-invalid');
      this.removeClass(element, 'tab-error');
      this.removeClass(element, 'has-error');
    });
  }

  handleTabsValidation() {
    if (!this.refs[this.tabLinkKey] || !this.refs[this.tabLinkKey].length || !this.tabs.length) {
      return;
    }

    this.clearErrorClasses(this.refs[this.tabLinkKey]);

    const invalidTabsIndexes = this.tabs.reduce((invalidTabs, tab, tabIndex) => {
      const hasComponentWithError = tab.some(comp => !!comp.error);
      return hasComponentWithError ? [...invalidTabs, tabIndex] : invalidTabs;
    }, []);

    if (!invalidTabsIndexes.length) {
      return;
    }

    const invalidTabs = [...this.refs[this.tabLinkKey]].filter((_, tabIndex) => invalidTabsIndexes.includes(tabIndex));
    this.setErrorClasses(invalidTabs);
  }
}
