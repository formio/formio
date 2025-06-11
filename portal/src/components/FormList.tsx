import { FormGrid, FormGridProps } from "@formio/react";
import { useState } from "react";
import { useHashLocation } from "wouter/use-hash-location";

type FormGridComponentProps = NonNullable<FormGridProps["components"]>;

const Container: FormGridComponentProps["Container"] = ({ children }) => (
    <div className="panel">{children}</div>
);

const FormActionsContainer: FormGridComponentProps["FormActionsContainer"] = ({
    children,
}) => <div className="item-buttons">{children}</div>;

const FormActionButton: FormGridComponentProps["FormActionButton"] = ({
    action,
    onClick,
}) => (
    <a
        className={`btn ${action && action.name === "Edit" ? "edit" : "trash"}`}
        onClick={onClick}
    >
        <i
            className={`${action && action.name === "Edit" ? "ri-edit-box-line" : "ri-delete-bin-line"}`}
        ></i>{" "}
        {action && action.name === "Edit" ? "Edit" : ""}
    </a>
);

const PaginationContainer: FormGridComponentProps["PaginationContainer"] = ({
    children,
}) => <div className="pagination-buttons">{children}</div>;

const PaginationButton: FormGridComponentProps["PaginationButton"] = ({
    isActive,
    disabled,
    children,
    onClick,
}) => (
    <a
        className={`pagination-btn${isActive ? " active" : ""}${disabled ? " disabled" : ""}`}
        onClick={onClick}
    >
        {children}
    </a>
);

const FormListHeader = ({ type }: { type: "form" | "resource" }) => {
    const setLocation = useHashLocation()[1];
    const isForm = type === "form";
    const name = isForm ? "Form" : "Resource";
    const pluralName = isForm ? "Forms" : "Resources";
    const [isBubbleActive, setBubbleActive] = useState(false);

    return (
        <div className="panel-header">
        <div className="panel-header-section top">
            <div className="panel-title icon">
                <img src={`icon-${type}.svg`} alt={`${type}s`} />{" "}
                {pluralName}
                <button
                    className={`help ${isBubbleActive ? 'active' : ''}`}
                    type="button"
                    onClick={() => setBubbleActive(!isBubbleActive)}
                >
                    <i className="ri-question-fill"></i>
                </button>

            </div>
            <div className={`help-bubble ${isBubbleActive ? 'active' : ''} top wide`}>
                <button
                    className="close-help"
                    type="button"
                    onClick={() => setBubbleActive(false)}
                >
                    <i className="ri-close-line"></i>
                </button>
                <p>
                    {
                        isForm
                            ? 'Forms are the primary interface within the Form.io system.'
                            :'Resources are the objects within your Project. Examples: User, Company, Vehicle, etc.'
                    }
                    {" "}
                    <a
                        target="_blank"
                        rel="noreferrer"
                        href={`https://help.form.io/userguide/${pluralName.toLocaleLowerCase()}`}
                    >
                        View documentation
                    </a>
                    .
                </p>
            </div>
            <button
                onClick={() => setLocation(`/new${type}`)}
                className={`button small new-${type} ${type === "form" ? "primary" : "blue"}`}
            >
                + New {name}
            </button>

        </div>
        <div className="panel-header-section bottom">
            {/* <SearchForm /> */}
        </div>
    </div>
    )
}

export const FormList = ({ type }: { type: "form" | "resource" }) => {
    const setLocation = useHashLocation()[1];
    const FormNameContainer: FormGridComponentProps["FormNameContainer"] = ({
        children,
        onClick,
    }) => {
        return (
            <div className="item-title" onClick={onClick}>
                <img src={`icon-${type}.svg`} alt={`${type} icon`} />
                {children}
            </div>
        );
    };
    const FormContainer: FormGridComponentProps["FormContainer"] = ({
        children,
    }) => (
        <div className={`item-wrap ${type}`}>
            <button className="item">{children}</button>
        </div>
    );

    return (
        <div className={`panel-wrap ${type}s card remember-focus`}>
            <FormListHeader type={type}/>
            <FormGrid
                formQuery={{ type }}
                onFormClick={(id) => setLocation(`/${type}/${id}/edit`)}
                components={{
                    Container,
                    FormContainer,
                    FormNameContainer,
                    FormActionsContainer,
                    FormActionButton,
                    PaginationContainer,
                    PaginationButton,
                }}
            />
        </div>
    );
};
