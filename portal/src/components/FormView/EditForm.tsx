import { useEffect, useState } from 'react';
import { FormEdit, FormType, useFormioContext } from '@formio/react';
import { useLocation } from 'wouter';

export const EditForm = ({
  url,
  type,
  onSaveForm = () => {},
}: {
  url: string;
  type: 'form' | 'resource';
  onSaveForm?: (data: FormType | any) => void;
}) => {
  const [
    initialForm,
    setInitialForm,
  ] = useState<FormType | undefined>();
  const { token } = useFormioContext();
  const setLocation = useLocation()[1];
  const name = type === 'form' ? 'Form' : 'Resource';
  useEffect(() => {
    // TODO: this should use the SDK and not naked fetch
    const fetchForm = async () => {
      const response = await fetch(url, { headers: { 'x-jwt-token': token } });
      if (!response.ok) {
        const message = await response.text();
        console.log('Fetching form failed:', message);
        return;
      }
      const form = await response.json();
      setInitialForm(form);
    };
    setInitialForm(undefined);
    fetchForm();
  }, [
    url,
  ]);
  return (
    <div className="panel enter-data active">
      {initialForm ? (
        <FormEdit
          onSaveForm={(form) => {
            setInitialForm(form);
            onSaveForm(form);
            setLocation('/edit');
          }}
          components={{
            SaveButtonContainer: ({ children }) => (
              <div className="save-form-bar button-wrap" style={{ justifyContent: 'end' }}>
                {children}
              </div>
            ),
            SaveButton: ({ onClick }) => (
              <button className="button save-form" onClick={onClick}>
                Save {name}
              </button>
            ),
          }}
          initialForm={initialForm}
        />
      ) : null}
    </div>
  );
};
