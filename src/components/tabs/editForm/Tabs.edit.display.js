import ComponentEditConditional from '../../_classes/component/editForm/Component.edit.conditional';
import ComponentEditLogic from '../../_classes/component/editForm/Component.edit.logic';

export default [
  {
    key: 'labelPosition',
    ignore: true
  },
  {
    key: 'placeholder',
    ignore: true
  },
  {
    key: 'description',
    ignore: true
  },
  {
    key: 'autofocus',
    ignore: true
  },
  {
    key: 'tooltip',
    ignore: true
  },
  {
    key: 'tabindex',
    ignore: true
  },
  {
    key: 'disabled',
    ignore: true
  },
  {
    key: 'tableView',
    ignore: true
  },
  {
    key: 'components',
    type: 'datagrid',
    input: true,
    label: 'Tabs',
    weight: 50,
    reorder: true,
    components: [
      {
        type: 'textfield',
        input: true,
        key: 'label',
        label: 'Label'
      },
      {
        type: 'textfield',
        input: true,
        key: 'key',
        label: 'Key',
        allowCalculateOverride: true,
        calculateValue: { _camelCase: [{ var: 'row.label' }] }
      },
      {
        'collapsible': false,
        'dataGridLabel': true,
        'modalEdit': true,
        'key': 'tab-conditional',
        'type': 'panel',
        'label': 'Conditional',
        'input': false,
        'tableView': false,
        'components': ComponentEditConditional
      },
      {
        'collapsible': false,
        'dataGridLabel': true,
        'modalEdit': true,
        'key': 'tab-field-logic',
        'type': 'panel',
        'label': 'Logic',
        'input': false,
        'tableView': false,
        'components': ComponentEditLogic
      }
    ]
  },
  {
    weight: 1100,
    type: 'checkbox',
    label: 'Vertical Layout',
    tooltip: 'Make this field display in vertical orientation.',
    key: 'verticalLayout',
    input: true
  },
];
