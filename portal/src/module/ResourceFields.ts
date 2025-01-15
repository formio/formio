// This is an ultra quick and dirty shim of the ResourceFields component, which has been deprecated but is still in use in some form actions
// TODO: update those actions to use the select component instead
import { Formio, Utils } from '@formio/js';

const NestedComponent = Formio.Components.components.nested;
class ResourceFields extends NestedComponent {
  data: any;
  _data: any;
  options: any;
  constructor(component: any, options: any, data: any) {
    component.components = [
      {
        type: 'select',
        label: 'Save submission to',
        authenticate: true,
        valueProperty: '_id',
        template: '<span>{{ item.title }}</span>',
        searchField: 'title__regex',
        key: 'resource',
        dataSrc: 'url',
        lazyLoad: false,
        tooltip: 'Select the Resource to save submissions to.',
        onChange(context: any) {
          if (context.instance && context.instance.parent) {
            context.instance.parent.addDynamicFields();
          }
        },
        data: {
          url: `${Formio.getBaseUrl()}/form?type=resource&limit=4294967295&select=_id,title`,
        },
      },
      {
        label: 'Resource Property',
        key: 'property',
        inputType: 'text',
        input: true,
        placeholder: 'Assign this resource to the following property',
        prefix: '',
        suffix: '',
        type: 'textfield',
        conditional: {
          json: { var: 'data.settings.resource' },
        },
      },
      {
        legend: 'Resource Fields',
        key: 'resourceFields',
        type: 'fieldset',
        components: [
          {
            type: 'well',
            components: [
              {
                type: 'content',
                html: 'Below are the fields within the selected resource. For each of these fields, select the corresponding field within this form that you wish to map to the selected Resource. <br /> Simple mappings may be used for any component that is not nested within a container, editgrid, datagrid or other nested data component.',
              },
            ],
          },
          {
            type: 'panel',
            title: 'Simple Mappings',
            key: 'dynamic',
            components: [],
          },
          {
            type: 'panel',
            title: 'Transform Mappings',
            key: 'transformPanel',
            components: [
              {
                input: true,
                label: 'Transform Data',
                key: 'transform',
                placeholder: '/** Example Code **/\ndata = submission.data;',
                rows: 8,
                defaultValue: '',
                persistent: true,
                editor: 'ace',
                type: 'textarea',
                description:
                  'Available variables are submission and data (data is already transformed by simple mappings).',
              },
            ],
          },
        ],
        conditional: {
          json: { var: 'data.settings.resource' },
        },
      },
    ];
    super(component, options, data);
  }

  addDynamicFields() {
    if (!this.data.resource) {
      return;
    }
    Formio.request(`${Formio.getBaseUrl()}/form/${this.data.resource}`).then((result: any) => {
      const dynamicFields = (this as any).getComponent('dynamic');
      dynamicFields.destroyComponents();
      const formFields = [
        {
          value: 'data',
          label: 'Entire Submission Data',
        },
      ];
      Utils.eachComponent(
        this.options.currentForm.components,
        (component: any, path: any) => {
          if (component.type !== 'button' && path.indexOf('.') === -1) {
            formFields.push({
              value: component.key,
              label: `${component.label || component.title || component.legend} (${component.key})`,
            });
          }
        },
        true,
      );

      Utils.eachComponent(
        result.components,
        (component: any, path: any) => {
          if (component.type !== 'button' && path.indexOf('.') === -1) {
            dynamicFields.addComponent(
              {
                type: 'select',
                input: true,
                label: `${component.label} (${component.key})`,
                key: `fields.${component.key}`,
                dataSrc: 'values',
                data: { values: formFields },
                validate: {
                  required: component.validate ? component.validate.required : false,
                },
              },
              this.data,
            );
          }
        },
        true,
      );
      dynamicFields.redraw();
    });
  }

  setValue(value: any, flags: any) {
    const changed = super.setValue(value, flags);
    this.addDynamicFields();
    return changed;
  }

  componentContext() {
    return this._data;
  }
}

export default ResourceFields;
