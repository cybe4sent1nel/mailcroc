import React from 'react';
import styles from './Switch.module.css';

interface SwitchProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    id?: string;
}

const Switch: React.FC<SwitchProps> = ({ checked, onChange, id = 'checkboxInput' }) => {
    return (
        <div className={styles.wrapper}>
            <div>
                <input
                    id={id}
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => onChange(e.target.checked)}
                    className={styles.checkboxInput}
                />
                <label className={styles.toggleSwitch} htmlFor={id}>
                </label>
            </div>
        </div>
    );
}

export default Switch;
