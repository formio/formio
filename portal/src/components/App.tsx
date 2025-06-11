import { useFormioContext } from "@formio/react";
import { Route, Router, Redirect } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";

import { Login } from "./Login";
import { Layout } from "./Layout";
import { useInfoPanelContext } from "../hooks/useInfoPanelContext";
import { FormList } from "./FormList";
import { FormView } from "./FormView";
import { NewForm } from "./NewForm";
import { HomePanel } from "./InfoPanel/HomePanel";
import { EditPanel } from "./InfoPanel/EditPanel";
import { AccessPanel } from "./InfoPanel/AccessPanel";
import { ActionsPanel } from "./InfoPanel/ActionsPanel";
import { UsePanel } from "./InfoPanel/UsePanel";
import { ViewDataPanel } from "./InfoPanel/ViewDataPanel";
import { CreatePanel } from "./InfoPanel/CreatePanel";

const App = () => {
    const { isAuthenticated, logout } = useFormioContext();
    const { isOpen, setIsOpen } = useInfoPanelContext();
    const [location] = useHashLocation();

    const toggleInfoPanel = () => {
        setIsOpen(!isOpen);
    };

    return (
        <Layout onInfoPanelClick={toggleInfoPanel} onLogoutClick={logout}>
            <Router hook={useHashLocation}>
                {isAuthenticated ? (
                    <>
                        <Route path="/login">
                            <Redirect to="/" />
                        </Route>
                        <Route path="/newform">
                            <div className="panels">
                                <NewForm type="form" />
                                <CreatePanel type="form" />
                            </div>
                        </Route>
                        <Route path="/newresource">
                            <div className="panels">
                                <NewForm type="resource" />
                                <CreatePanel type="resource" />
                            </div>
                        </Route>
                        <Route path="/resource/:id" nest>
                            {(params) => (
                                <div className="panels">
                                    <FormList type="resource" />
                                    <FormList type="form" />
                                    <FormView type="resource" params={params} />
                                    {(location === `/resource/${params.id}` ||
                                        location ===
                                            `/resource/${params.id}/edit/`) && (
                                        <EditPanel type="resource" />
                                    )}
                                    {location ===
                                        `/resource/${params.id}/use` && (
                                        <UsePanel type="resource" />
                                    )}
                                    {location ===
                                        `/resource/${params.id}/view` && (
                                        <ViewDataPanel />
                                    )}
                                    {location ===
                                        `/resource/${params.id}/actions` && (
                                        <ActionsPanel type="resource" />
                                    )}
                                    {location ===
                                        `/resource/${params.id}/access` && (
                                        <AccessPanel type="resource" />
                                    )}
                                </div>
                            )}
                        </Route>
                        <Route path="/form/:id" nest>
                            {(params) => (
                                <div className="panels">
                                    <FormList type="resource" />
                                    <FormList type="form" />
                                    <FormView type="form" params={params} />
                                    {(location === `/form/${params.id}` ||
                                        location ===
                                            `/form/${params.id}/edit`) && (
                                        <EditPanel type="form" />
                                    )}
                                    {location === `/form/${params.id}/use` && (
                                        <UsePanel type="form" />
                                    )}
                                    {location === `/form/${params.id}/view` && (
                                        <ViewDataPanel />
                                    )}
                                    {location ===
                                        `/form/${params.id}/actions` && (
                                        <ActionsPanel type="form" />
                                    )}
                                    {location ===
                                        `/form/${params.id}/access` && (
                                        <AccessPanel type="form" />
                                    )}
                                </div>
                            )}
                        </Route>
                        <Route path="/">
                            <div className="panels">
                                <FormList type="resource" />
                                <FormList type="form" />
                                <HomePanel />
                            </div>
                        </Route>
                    </>
                ) : (
                    <Login />
                )}
            </Router>
        </Layout>
    );
};

export default App;
