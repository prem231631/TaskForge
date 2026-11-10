
import {
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'

import './StatCard.css'

export default function StatCard({
  title,
  value,
  change,
  description,
  icon: Icon,
  positive = true,
}) {
  return (
    <div className="stat-card">
      <div className="stat-card__top">
        <div>
          <p className="stat-card__title">
            {title}
          </p>

          <h3 className="stat-card__value">
            {value}
          </h3>
        </div>

        <div className="stat-card__icon">
          <Icon size={21} />
        </div>
      </div>

      <div className="stat-card__bottom">
        {change && (
          <span
            className={`stat-card__change ${
              positive
                ? 'stat-card__change--positive'
                : 'stat-card__change--negative'
            }`}
          >
            {positive ? (
              <ArrowUpRight size={13} />
            ) : (
              <ArrowDownRight size={13} />
            )}

            {change}
          </span>
        )}

        <span className="stat-card__description">
          {description}
        </span>
      </div>
    </div>
  )
}
