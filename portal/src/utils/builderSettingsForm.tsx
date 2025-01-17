import { DEFAULT_SETTINGS_FORM } from "@formio/react";
import { Utils } from "@formio/js";

function getBuilderSettingsForm() {
    const defaultSettingsForm = Utils.fastCloneDeep(DEFAULT_SETTINGS_FORM);
    const displayComponent = Utils.getComponent(defaultSettingsForm.components, 'display');
    if (Array.isArray(displayComponent?.data?.values)) {
        displayComponent.data.values = displayComponent.data.values.filter((opt: {value: string, label: string}) => opt.value !== 'pdf');
    }
    return defaultSettingsForm;
}

export default getBuilderSettingsForm();
