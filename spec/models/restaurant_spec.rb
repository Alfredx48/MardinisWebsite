require "rails_helper"

RSpec.describe Restaurant, type: :model do
  let(:restaurant) { create_restaurant }

  it "knows when it's open (Mon-Sat 9-9, Sun 10-8 by default)" do
    expect(restaurant.open_now?(Time.zone.parse("2026-09-23 08:59"))).to be(false)
    expect(restaurant.open_now?(Time.zone.parse("2026-09-23 09:00"))).to be(true)
    expect(restaurant.open_now?(Time.zone.parse("2026-09-27 09:30"))).to be(false) # Sunday
    expect(restaurant.open_now?(Time.zone.parse("2026-09-27 19:59"))).to be(true)
  end

  it "stops ASAP orders when prep time would run past closing" do
    expect(restaurant.accepting_asap_orders?(Time.zone.parse("2026-09-23 20:30"))).to be(true)
    expect(restaurant.accepting_asap_orders?(Time.zone.parse("2026-09-23 20:45"))).to be(false)
  end

  it "handles hours that run past midnight" do
    restaurant.hours["fri"] = { "open" => "18:00", "close" => "02:00", "closed" => false }
    expect(restaurant.open_now?(Time.zone.parse("2026-09-26 01:00"))).to be(true) # early Saturday
  end

  it "offers 15-minute pickup slots starting after prep time" do
    slots = restaurant.pickup_slots(Time.zone.parse("2026-09-23 12:02"))
    today = slots.first
    expect(today[:date]).to eq("2026-09-23")
    expect(Time.zone.parse(today[:times].first)).to eq(Time.zone.parse("2026-09-23 12:30"))
    expect(Time.zone.parse(today[:times].last)).to eq(Time.zone.parse("2026-09-23 21:00"))
  end

  it "skips closed days" do
    restaurant.hours["thu"]["closed"] = true
    dates = restaurant.pickup_slots(Time.zone.parse("2026-09-23 22:00")).map { |d| d[:date] }
    expect(dates).to eq(%w[2026-09-25])
  end
end
