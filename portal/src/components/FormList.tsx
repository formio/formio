import { FormGrid, FormGridProps } from "@formio/react";
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

    const name = type === "form" ? "Form" : "Resource";
    const pluralName = type === "form" ? "Forms" : "Resources";

    return (
        <div className={`panel-wrap ${type}s card remember-focus`}>
            <div className="panel-header">
                <div className="panel-header-section top">
                    <div className="panel-title icon">
                        <img src={`icon-${type}.svg`} alt={`${type}s`} />{" "}
                        {pluralName}
                        <button className="help" type="button">
                            <i className="ri-question-fill"></i>
                        </button>
                    </div>

                    <a
                        onClick={() => setLocation(`/new${type}`)}
                        className={`button small new-${type} ${type === "form" ? "primary" : "blue"}`}
                    >
                        + New {name}
                    </a>
                    <div className="help-bubble top wide">
                        <button className="close-help" type="button">
                            <i className="ri-close-line"></i>
                        </button>
                        <p>
                            Resources are the objects within your Project.
                            Examples: User, Company, Vehicle, etc.{" "}
                            <a
                                target="_blank"
                                rel="noreferrer"
                                href="https://help.form.io/userguide/introduction#resources"
                            >
                                View documentation
                            </a>
                            .
                        </p>
                    </div>
                </div>
                <div className="panel-header-section bottom">
                    {/* <SearchForm /> */}
                </div>
            </div>
            <FormGrid
                formQuery={{ type }}
                onFormClick={(id) => setLocation(`/${type}/${id}`)}
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
