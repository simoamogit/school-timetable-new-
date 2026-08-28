// frontend/src/components/TextField.jsx — NUOVO FILE
// Input M3 "outlined" con la label che interrompe il bordo in alto (il
// classico "notch" M3). Props identiche a un <input> normale più `label`.
export default function TextField({ label, id, style, ...inputProps }) {
  const fieldId = id || `field-${label?.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <div className="m3-field" style={style}>
      {label && <label htmlFor={fieldId} className="m3-field-label">{label}</label>}
      <input id={fieldId} {...inputProps} />
    </div>
  );
}