import { useFormioContext } from '@formio/react';
import { ReactNode } from 'react';
import { useHashLocation } from 'wouter/use-hash-location';
import packageJSON from '../../package.json';
export const Layout = ({
  children,
  onInfoPanelClick,
  onLogoutClick,
}: {
  children: ReactNode;
  onInfoPanelClick: () => void;
  onLogoutClick: () => void;
}) => {
  const setLocation = useHashLocation()[1];
  const { isAuthenticated } = useFormioContext();
  const appVersion: string = packageJSON.version;
  const rendererVersion: string = packageJSON.dependencies['@formio/js'].replace(/[\^~]/g, '');
  const formioReactVersion: string = packageJSON.dependencies['@formio/react'].replace(
    /[\^~]/g,
    '',
  );
  const reactVersion: string = packageJSON.dependencies['react'].replace(/[\^~]/g, '');
  const copyrightYear = new Date().getFullYear();
  return (
    <main>
      <header className="remember-focus">
        <div className="header-title-wrap">
          <a onClick={() => setLocation('/')} className="logo">
            <img src="logo-formio-horizontal-lightbg.svg" alt="" />
          </a>
          <div className="header-title"></div>
        </div>
        {isAuthenticated && (
          <div className="right-buttons">
            <button
              type="button"
              onClick={onInfoPanelClick}
              title="Show/Hide Context For This Screen"
              className="togglecontext"
            >
              <i className="ri-arrow-right-s-line"></i>Info Panel
            </button>
            <a onClick={onLogoutClick} className="logout">
              Logout<i className="ri-login-box-line"></i>
            </a>
          </div>
        )}
      </header>
      {children}
      <footer className="panel-footer footer justify-content-center pt-2">
        <a href="https://form.io" className="d-flex w-auto justify-content-center text-center">
          <img
            className="logo w-32 mb-1"
            alt="Form.io"
            src="https://portal.form.io/template/images/formio-logo-white.png"
            height="60px"
          />
        </a>
        <p className="text-center text-muted mb-0">
          App Version: v{appVersion}, Renderer: v{rendererVersion}
        </p>
        <p className="text-center text-muted mb-0">
          React: v{reactVersion}, React Module: v{formioReactVersion}
        </p>
        <p className="text-center text-muted mb-0">
          Copyright © Form.io LLC {copyrightYear}. All rights reserved
        </p>
      </footer>
    </main>
  );
};
