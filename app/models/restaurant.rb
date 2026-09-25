class Restaurant < ApplicationRecord
  DAYS = %w[sun mon tue wed thu fri sat].freeze
  TIME_FORMAT = /\A([01]\d|2[0-3]):[0-5]\d\z/
  PICKUP_SLOT_MINUTES = 15
  SCHEDULE_DAYS_AHEAD = 2

  has_many :categories, -> { order(:position, :id) }, dependent: :destroy
  has_many :menu_items, dependent: :destroy
  has_many :orders, dependent: :destroy
  has_many :order_items, through: :orders
  has_many :catering_inquiries, dependent: :destroy

  validates :name, presence: true
  validates :tax_rate, numericality: { greater_than_or_equal_to: 0, less_than: 0.25 }
  validates :prep_time_minutes, numericality: { only_integer: true, greater_than_or_equal_to: 0, less_than_or_equal_to: 240 }
  validate :hours_are_well_formed

  def self.current
    first!
  end

  # Opening window for a given date as [open_time, close_time], or nil when closed.
  def window_for(date)
    day = hours_for(date)
    return nil if day.nil? || day["closed"]

    open_at = Time.zone.parse("#{date} #{day['open']}")
    close_at = Time.zone.parse("#{date} #{day['close']}")
    close_at += 1.day if close_at <= open_at
    [open_at, close_at]
  end

  def open_now?(now = Time.zone.now)
    [now.to_date - 1, now.to_date].any? do |date|
      window = window_for(date)
      window && now >= window[0] && now < window[1]
    end
  end

  def accepting_asap_orders?(now = Time.zone.now)
    accepting_orders && open_now?(now) && earliest_pickup(now) <= closing_time(now)
  end

  def earliest_pickup(now = Time.zone.now)
    now + prep_time_minutes.minutes
  end

  def closing_time(now = Time.zone.now)
    [now.to_date - 1, now.to_date].each do |date|
      window = window_for(date)
      return window[1] if window && now >= window[0] && now < window[1]
    end
    nil
  end

  # Upcoming pickup slots customers can schedule for, grouped by date.
  def pickup_slots(now = Time.zone.now)
    return [] unless accepting_orders

    earliest = earliest_pickup(now)
    (0..SCHEDULE_DAYS_AHEAD).filter_map do |offset|
      date = now.to_date + offset
      window = window_for(date)
      next unless window

      slot = [window[0] + PICKUP_SLOT_MINUTES.minutes, round_up(earliest)].max
      times = []
      while slot <= window[1]
        times << slot
        slot += PICKUP_SLOT_MINUTES.minutes
      end
      { date: date.iso8601, times: times.map(&:iso8601) } if times.any?
    end
  end

  def valid_pickup_time?(time, now = Time.zone.now)
    return false unless accepting_orders
    return false if time < earliest_pickup(now) - 1.minute
    return false if time > now + (SCHEDULE_DAYS_AHEAD + 1).days

    [time.to_date - 1, time.to_date].any? do |date|
      window = window_for(date)
      window && time > window[0] && time <= window[1]
    end
  end

  private

  def hours_for(date)
    (hours || {})[DAYS[date.wday]]
  end

  def round_up(time)
    step = PICKUP_SLOT_MINUTES * 60
    Time.zone.at((time.to_i / step.to_f).ceil * step)
  end

  def hours_are_well_formed
    unless hours.is_a?(Hash) && DAYS.all? { |d| hours[d].is_a?(Hash) }
      return errors.add(:hours, "must include every day of the week")
    end

    DAYS.each do |d|
      day = hours[d]
      next if day["closed"]

      unless day["open"].to_s.match?(TIME_FORMAT) && day["close"].to_s.match?(TIME_FORMAT)
        errors.add(:hours, "for #{d.capitalize} need open and close times like 09:00")
      end
    end
  end
end
