import {
  Form,
  useFormioContext,
  usePagination,
  FormType,
  Submission,
  FormProps,
} from '@formio/react';
import { Component, ButtonComponent } from '@formio/core';
import { Utils } from '@formio/js';
import { useCallback, useState, useRef, useEffect } from 'react';

export type FormAction = {
  _id: string;
  title: string;
  name: string;
  handler: ['before' | 'after'];
  method: ['create' | 'update' | 'delete' | 'read' | 'index'];
  priority: number;
  form: string;
  machineName: string;
};

const getActionInfo = async (formId: string, actionName: string, token: string) => {
  const response = await fetch(`/form/${formId}/actions/${actionName}`, {
    headers: { 'x-jwt-token': token },
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
};

const getPossibleActionsForm = (id: string) => ({
  display: 'form' as const,
  components: [
    {
      label: 'Available Actions',
      widget: 'choicesjs',
      hideLabel: true,
      tableView: true,
      dataSrc: 'url',
      data: {
        url: `/form/${id}/actions`,
        headers: [
          {
            key: '',
            value: '',
          },
        ],
      },
      template: '<span>{{ item.title }}</span>',
      key: 'action',
      type: 'select',
      input: true,
      disableLimit: false,
      noRefreshOnScroll: false,
    },
  ],
});

const isButtonComponent = (comp: Component): comp is ButtonComponent => comp.type === 'button';

export const FormActions = ({ formId, limit }: { formId: string; limit?: number }) => {
  const [displayedAction, setDisplayedAction] = useState<FormAction | null>(null);
  const [activeAction, setActiveAction] = useState<{
    form: FormType;
    submission: Submission;
    action: 'Add' | 'Update';
    title: string;
  } | null>(null);
  const [currentForm, setCurrentForm] = useState<FormType | undefined>();
  const { Formio, token } = useFormioContext();
  const actionToAdd = useRef<FormAction | null>(null);
  const fetchFunction = useCallback(async () => {
    try {
      const formio = new Formio(`/form/${formId}`);
      return formio.loadActions({}, { ignoreCache: true });
    } catch (err) {
      console.error('Failed to load form actions:', err);
      return [];
    }
  }, [Formio, formId]);
  const { data, setPage } = usePagination<FormAction>(1, limit || 10, fetchFunction);

  useEffect(() => {
    const formio = new Formio(`/form/${formId}`);
    formio.loadForm().then(setCurrentForm);
  }, [Formio, formId]);

  const handleActionClick = async (id: string) => {
    const formio = new Formio(`/form/${formId}/action/${id}`);
    try {
      const action = await formio.loadAction(id);
      setDisplayedAction(action);
    } catch (err) {
      console.error('Failed to load action:', err);
    }
  };

  const handleAddAction = async (action: FormAction) => {
    try {
      const actionInfo = await getActionInfo(formId, action.name, token);
      // check for presence of not hidden handler and method components
      let hasHandlerField = false;
      let hasMethodField = false;
      Utils.eachComponent(
        actionInfo.settingsForm.components,
        (component: any, path: any) => {
          if (component.key === 'handler' && component.type !== 'hidden') {
            hasHandlerField = true;
          }
          if (component.key === 'method' && component.type !== 'hidden') {
            hasMethodField = true;
          }
        },
        true,
      );

      const submissionData = {
        ...action,
      };

      // if handler and method are not present in he form, set to defaults
      const defaults = actionInfo?.defaults;
      if (!hasHandlerField && defaults?.handler) {
        submissionData.handler = defaults.handler;
      }
      if (!hasMethodField && defaults?.method) {
        submissionData.method = defaults.method;
      }
      setActiveAction({
        form: actionInfo.settingsForm,
        title: actionInfo.title,
        submission: {
          data: submissionData,
        },
        action: 'Add',
      });
    } catch (err) {
      console.error('Failed to add action:', err);
    }
  };

  const handleEditAction = async (id: string, name: string) => {
    try {
      const thisActionFormio = new Formio(`/form/${formId}/action/${id}`);
      const actionPromise = thisActionFormio.loadAction();
      const actionInfoPromise = getActionInfo(formId, name, token);
      const [action, actionInfo] = await Promise.all([actionPromise, actionInfoPromise]);
      // because the `action` param only allows for POST requests, we need to modify the `settingsForm` to emit a custom action on submit
      const settingsForm: FormType = actionInfo.settingsForm;
      const submitButton = settingsForm.components.find(
        (comp: Component) => isButtonComponent(comp) && comp.action === 'submit',
      );
      if (!submitButton) {
        console.warn("Can't edit action without submit button");
        return;
      }
      (submitButton as ButtonComponent).action = 'event';
      (submitButton as ButtonComponent).event = 'updateAction';
      setActiveAction({
        form: settingsForm,
        title: action.title,
        submission: { data: action },
        action: 'Update',
      });
    } catch (err) {
      console.error('Failed to load action:', err);
    }
  };

  const handleDeleteAction = async (id: string) => {
    const formio = new Formio(`/form/${formId}/action/${id}`);
    try {
      await formio.deleteAction();
    } catch (err) {
      console.error('Failed to delete action:', err);
    }
    setPage(1);
  };

  const handleCustomEvent: FormProps['onCustomEvent'] = async ({ type, data }) => {
    if (type === 'updateAction') {
      const formio = new Formio(`/form/${formId}/action/${data._id}`);
      try {
        await formio.saveAction(data);
        setPage(1);
        setActiveAction(null);
      } catch (err) {
        console.error('Failed to update action:', err);
      }
    }
  };

  const actionsToMap = displayedAction ? [displayedAction] : data;

  return (
    <div className="panel form-actions active">
      <div className="form-actions-wrap remember-focus-actions">
        <div className="form-action-row heading">
          <div className="form-action-title">Name</div>
          <div className="form-action-title">Operations</div>
        </div>
        {actionsToMap.map((action) => (
          <div className="form-action-row action" key={action._id}>
            <div className="form-action-name">
              <button className="textlink" onClick={() => handleActionClick(action._id)}>
                {action.title || action.name}
              </button>
            </div>
            <div className="form-action-op">
              <div className="button-wrap">
                <button
                  className="button edit-form-action small withicon"
                  onClick={() => handleEditAction(action._id, action.name)}
                >
                  <i className="ri-edit-box-line"></i>Edit
                </button>
                <button
                  className="button delete-form-action red small withicon"
                  onClick={() => handleDeleteAction(action._id)}
                >
                  <i className="ri-delete-bin-line"></i>Delete
                </button>
              </div>
            </div>
          </div>
        ))}
        <div className="form-action-row add">
          <div className="form-action-add-wrap">
            <Form
              src={getPossibleActionsForm(formId)}
              onChange={(value, _, modified) => {
                if (modified) {
                  actionToAdd.current = value.data.action as FormAction;
                }
              }}
            />
            <button
              className="button withicon add-action"
              onClick={() => actionToAdd.current && handleAddAction(actionToAdd.current)}
            >
              <i className="ri-add-line"></i> Add Action
            </button>
            <p className="helptext">
              <a target="_blank" rel="noreferrer" href="https://help.form.io/userguide/form-building/actions">
                View documentation
              </a>{' '}
              on actions.
            </p>
          </div>
        </div>
        {activeAction && (
          <div className="entry-details-wrap active">
            <div className="entry-details-menu-wrap">
              <button
                className="close-button close-entry-details"
                onClick={() => setActiveAction(null)}
              >
                <i className="ri-close-line"></i>
              </button>
              <div className="entry-details-title">
                {activeAction.action} Action: {activeAction.title}
              </div>
            </div>
            <div className="entry-details-content edit-action active">
              <Form
                src={activeAction.form}
                submission={activeAction.submission}
                onCustomEvent={handleCustomEvent}
                onSubmitDone={() => {
                  setPage(1);
                  setActiveAction(null);
                }}
                options={{ currentForm }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
