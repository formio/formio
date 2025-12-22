import { useLocation } from 'wouter';
import { useState } from 'react';

export type FormDisplayData = {
  title: string;
  name: string;
};

export const FormMenu = ({ type, formDisplayData } : {
  type: 'form' | 'resource',
  formDisplayData: FormDisplayData | undefined,
}) => {
  const [
    location,
    setLocation,
  ] = useLocation();
  const [menuIsActive, setMenuIsActive] = useState(false);
  const toggleContentMenu = () => {
    setMenuIsActive((isActive) => !isActive);
  };
  const menuItemClick = (location: string) => {
    setMenuIsActive(false);
    setLocation(location);
  };
  const name = type === 'form' ? 'Form' : 'Resource';

  return (
    <div className="panel-header">
      <div className="panel-header-section top">
        <div className="panel-title icon">
          <img src={`icon-${type}.svg`} alt="" />{' '}
          {formDisplayData?.title || formDisplayData?.name}
        </div>
        <button className="content-menu-button" onClick={() => toggleContentMenu()}>
          <i className="ri-menu-line"></i>Menu
        </button>
      </div>
      <div className={`panel-header-section bottom ${menuIsActive ? 'active' : ''}`}>
        <div className="content-menu">
          <button
            className={`menu-item enter-data${location === '/edit' || location === '/' ? ' active' : ''}`}
            onClick={() => menuItemClick('/edit')}
          >
            Edit {name}
          </button>
          <button
            className={`menu-item enter-data${location === '/use' ? ' active' : ''}`}
            onClick={() => menuItemClick('/use')}
          >
            Enter Data
          </button>
          <button
            className={`menu-item enter-data${location === '/view' ? ' active' : ''}`}
            onClick={() => menuItemClick('/view')}
          >
            View Data
          </button>
          <button
            className={`menu-item enter-data${location === '/actions' ? ' active' : ''}`}
            onClick={() => menuItemClick('/actions')}
          >
            <span className="item-type-label">{name} Actions</span>
          </button>
          <button
            className={`menu-item enter-data${location === '/access' ? ' active' : ''}`}
            onClick={() => menuItemClick('/access')}
          >
            Access
          </button>
        </div>
      </div>
    </div>
  );
};
