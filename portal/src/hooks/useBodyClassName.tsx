import { useEffect } from "react";

export const useBodyClassName = (className: string = "") => {
    useEffect(() => {
        if (!className) return;
        const classesToAdd = className.split(" ");
        document.body.classList.add(...classesToAdd);
        return () => {
            document.body.classList.remove(...classesToAdd);
        };
    }, [className]);
};
