import { useCallback, useEffect, useState } from "react";
import { Params, Route, Switch, useLocation } from "wouter";
import { EnterData } from "./EnterData";
import { ViewData } from "./ViewData";
import { EditForm } from "./EditForm";
import { useHashLocation } from "wouter/use-hash-location";
import { FormActions } from "./FormActions";
import { FormAccess } from "./FormAccess";
import { useBodyClassName } from "../../hooks/useBodyClassName";

type FormDisplayData = {
    title: string;
    name: string;
};

export const FormView = ({
    params,
    type,
}: {
    params: Params<{ id: string }>;
    type: "form" | "resource";
}) => {
    useBodyClassName(`item-open ${type}-open`);
    const { id } = params;
    const [location, setLocation] = useLocation();
    const setHashLocation = useHashLocation()[1];
    const [formDisplayData, setFormDisplayData] = useState<
        FormDisplayData | undefined
    >();
    const formUrl = `/form/${id}`;
    const name = type === "form" ? "Form" : "Resource";

    useEffect(() => {
        const fetchFormDisplayData = async () => {
            const response = await fetch(`${formUrl}?select=title,name`);
            if (!response.ok) {
                const message = await response.text();
                console.log("Fetching form display data failed:", message);
                return;
            }
            const data: FormDisplayData = await response.json();
            setFormDisplayData(data);
        };
        fetchFormDisplayData();
    }, [formUrl]);

    const onSaveForm = useCallback((data: any) => {
        if (data){
            setFormDisplayData(data);
        }
    }, [setFormDisplayData])

    return (
        <div
            className={`panel-wrap content main card remember-focus-content edit-content active ${type}`}
        >
            <button className="reverse-tab" aria-hidden="true"></button>
            <button className="forward-landing" aria-hidden="true"></button>
            <div className="panel-header">
                <div className="panel-header-section top">
                    <div className="panel-title icon">
                        <img src={`icon-${type}.svg`} alt="" />{" "}
                        {formDisplayData?.title || formDisplayData?.name}
                    </div>
                    <button
                        type="button"
                        onClick={() => setHashLocation("/")}
                        className="close-button close-item transition last-focused"
                    >
                        <i className="ri-close-line"></i>
                    </button>
                    <button className="content-menu-button">
                        <i className="ri-menu-line"></i>Menu
                    </button>
                </div>
                <div className="panel-header-section bottom">
                    <div className="content-menu">
                        <button
                            className={`menu-item enter-data${location === "/edit" || location === "/" ? " active" : ""}`}
                            onClick={() => setLocation("/edit")}
                        >
                            Edit {name}
                        </button>
                        <button
                            className={`menu-item enter-data${location === "/use" ? " active" : ""}`}
                            onClick={() => setLocation("/use")}
                        >
                            Enter Data
                        </button>
                        <button
                            className={`menu-item enter-data${location === "/view" ? " active" : ""}`}
                            onClick={() => setLocation("/view")}
                        >
                            View Data
                        </button>
                        <button
                            className={`menu-item enter-data${location === "/actions" ? " active" : ""}`}
                            onClick={() => setLocation("/actions")}
                        >
                            <span className="item-type-label">{name}{" "}Actions</span>
                        </button>
                        <button
                            className={`menu-item enter-data${location === "/access" ? " active" : ""}`}
                            onClick={() => setLocation("/access")}
                        >
                            Access
                        </button>
                    </div>
                </div>
            </div>
            <Switch>
                <Route path="/use">
                    <EnterData url={formUrl} />
                </Route>
                <Route path="/view">
                    <ViewData formId={id} />
                </Route>
                <Route path="/edit">
                    <EditForm type={type} url={formUrl} onSaveForm={onSaveForm}/>
                </Route>
                <Route path="/access">
                    <FormAccess id={id} />
                </Route>
                <Route path="/actions">
                    <FormActions formId={id} />
                </Route>
                <Route path="/">
                    <EditForm type={type} url={formUrl} onSaveForm={onSaveForm}/>
                </Route>
            </Switch>
        </div>
    );
};
