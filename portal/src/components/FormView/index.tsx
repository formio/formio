import { useCallback, useEffect, useState } from 'react';
import { Params, Route, Switch, useLocation } from 'wouter';
import { EnterData } from './EnterData';
import { ViewData } from './ViewData';
import { EditForm } from './EditForm';
import { FormActions } from './FormActions';
import { FormAccess } from './FormAccess';
import { useBodyClassName } from '../../hooks/useBodyClassName';
import { useFormioContext } from '@formio/react';
import { FormDisplayData, FormMenu } from './FormMenu';

export const FormView = ({
  params,
  type,
}: {
  params: Params<{ id: string }>;
  type: 'form' | 'resource';
}) => {
  useBodyClassName(`item-open ${type}-open`);
  const { id } = params;
  const [
    formDisplayData,
    setFormDisplayData,
  ] = useState<FormDisplayData | undefined>();
  const formUrl = `/form/${id}`;
  const { token } = useFormioContext();

  useEffect(() => {
    const fetchFormDisplayData = async () => {
      // TODO: this should use the SDK and not naked fetch
      const response = await fetch(`${formUrl}?select=title,name`, {
        headers: {
          'x-jwt-token': token,
        },
      });
      if (!response.ok) {
        const message = await response.text();
        console.log('Fetching form display data failed:', message);
        return;
      }
      const data: FormDisplayData = await response.json();
      setFormDisplayData(data);
    };
    fetchFormDisplayData();
  }, [
    formUrl,
  ]);

  const onSaveForm = useCallback(
    (data: any) => {
      if (data) {
        setFormDisplayData(data);
      }
    },
    [
      setFormDisplayData,
    ],
  );

  return (
    <div
      className={`panel-wrap content main card remember-focus-content edit-content active ${type}`}
    >
      <button className="reverse-tab" aria-hidden="true"></button>
      <button className="forward-landing" aria-hidden="true"></button>
      <FormMenu type={type} formDisplayData={formDisplayData} />
      <Switch>
        <Route path="/use">
          <EnterData url={formUrl} />
        </Route>
        <Route path="/view">
          <ViewData formId={id} />
        </Route>
        <Route path="/edit">
          <EditForm type={type} url={formUrl} onSaveForm={onSaveForm} />
        </Route>
        <Route path="/access">
          <FormAccess id={id} />
        </Route>
        <Route path="/actions">
          <FormActions formId={id} />
        </Route>
        <Route path="/">
          <EditForm type={type} url={formUrl} onSaveForm={onSaveForm} />
        </Route>
      </Switch>
    </div>
  );
};
