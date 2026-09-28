require "rails_helper"

RSpec.describe "Passwords", type: :request do
  let!(:restaurant) { create_restaurant }
  let!(:user) { create_user(email: "kim@example.com") }

  def reset_link_token(url)
    URI.decode_www_form(URI(url).query).to_h["token"]
  end

  describe "forgot password" do
    before { allow(EmailSender).to receive(:configured?).and_return(true) }

    it "emails a reset link that points at the real site" do
      expect(EmailSender).to receive(:deliver!) do |to:, subject:, text:, html:|
        expect(to).to eq(user.email)
        expect(subject).to include("Reset")
        expect(text).to include("http://www.example.com/reset-password?token=")
        expect(html).to include("Choose a new password")
      end
      post "/api/password/forgot", params: { email: " KIM@example.com " }, as: :json
      expect(json).to eq("email_enabled" => true)
    end

    it "answers the same for unknown emails and sends nothing" do
      expect(EmailSender).not_to receive(:deliver!)
      post "/api/password/forgot", params: { email: "nobody@example.com" }, as: :json
      expect(response).to have_http_status(:ok)
      expect(json).to eq("email_enabled" => true)
    end

    it "says so when email isn't set up" do
      allow(EmailSender).to receive(:configured?).and_return(false)
      expect(EmailSender).not_to receive(:deliver!)
      post "/api/password/forgot", params: { email: user.email }, as: :json
      expect(json).to eq("email_enabled" => false)
    end

    it "doesn't reveal a failed send" do
      allow(EmailSender).to receive(:deliver!).and_raise(EmailSender::Error, "Resend HTTP 500")
      post "/api/password/forgot", params: { email: user.email }, as: :json
      expect(response).to have_http_status(:ok)
    end
  end

  describe "resetting" do
    let(:token) { user.password_reset_token }

    it "sets the new password, signs in, and the link only works once" do
      get "/api/password/reset", params: { token: token }
      expect(json).to eq("name" => "Sam")

      post "/api/password/reset", params: { token: token, password: "newpassword1", password_confirmation: "newpassword1" }, as: :json
      expect(response).to have_http_status(:ok)
      expect(user.reload.authenticate("newpassword1")).to be_truthy
      get "/api/me"
      expect(json["id"]).to eq(user.id)

      post "/api/password/reset", params: { token: token, password: "another1234", password_confirmation: "another1234" }, as: :json
      expect(response).to have_http_status(:unprocessable_content)
      expect(json["errors"].first).to include("already used")
    end

    it "expires emailed links after 30 minutes, and says so" do
      token
      travel 29.minutes do
        get "/api/password/reset", params: { token: token }
        expect(response).to have_http_status(:ok)
      end
      travel 31.minutes do
        get "/api/password/reset", params: { token: token }
        expect(response).to have_http_status(:unprocessable_content)
        expect(json["errors"]).to eq(["This reset link has expired. Please ask for a new one."])
      end
    end

    it "explains a garbled link" do
      get "/api/password/reset", params: { token: "not-a-real-link" }
      expect(json["errors"]).to eq(["This reset link isn't valid. Please ask for a new one."])
    end

    it "rejects bad tokens, blank and mismatched passwords" do
      post "/api/password/reset", params: { token: "nope", password: "newpassword1" }, as: :json
      expect(response).to have_http_status(:unprocessable_content)
      post "/api/password/reset", params: { token: token, password: "" }, as: :json
      expect(json["errors"]).to eq(["Enter a new password"])
      post "/api/password/reset", params: { token: token, password: "newpassword1", password_confirmation: "different1" }, as: :json
      expect(response).to have_http_status(:unprocessable_content)
      post "/api/password/reset", params: { token: token, password: "short", password_confirmation: "short" }, as: :json
      expect(response).to have_http_status(:unprocessable_content)
      expect(user.reload.authenticate("password123")).to be_truthy
    end

    it "signs the account out on every other device" do
      log_in(user)
      other_device = cookies.to_hash.dup
      post "/api/password/reset", params: { token: token, password: "newpassword1", password_confirmation: "newpassword1" }, as: :json
      expect(response).to have_http_status(:ok)

      cookies.delete("_mardinis_session")
      cookies["_mardinis_session"] = other_device["_mardinis_session"]
      get "/api/me"
      expect(response.body).to eq("null")
    end
  end

  describe "changing the password while signed in" do
    it "keeps this device signed in and signs out the others" do
      log_in(user)
      other_device = cookies["_mardinis_session"]
      patch "/api/me", params: { password: "newpassword1", password_confirmation: "newpassword1", current_password: "password123" }, as: :json
      expect(response).to have_http_status(:ok)
      get "/api/me"
      expect(json["id"]).to eq(user.id)

      cookies["_mardinis_session"] = other_device
      get "/api/me"
      expect(response.body).to eq("null")
    end

    it "keeps sessions from before this change signed in" do
      log_in(user)
      # Simulate a pre-fingerprint session by signing in the old way.
      allow_any_instance_of(ApplicationController).to receive(:log_in) { |c, u| c.session[:user_id] = u.id }
      post "/api/login", params: { email: user.email, password: "password123" }, as: :json
      get "/api/me"
      expect(json["id"]).to eq(user.id)
    end
  end

  describe "admin reset links" do
    let(:admin) { create_user(admin: true) }

    it "lets admins make a day-long link that works once" do
      log_in(admin)
      post "/api/admin/users/#{user.id}/reset_link"
      expect(response).to have_http_status(:ok)
      token = reset_link_token(json["url"])
      expect(json["url"]).to start_with("http://www.example.com/reset-password?token=")
      delete "/api/logout"

      travel 23.hours do
        post "/api/password/reset", params: { token: token, password: "newpassword1", password_confirmation: "newpassword1" }, as: :json
        expect(response).to have_http_status(:ok)
      end
      post "/api/password/reset", params: { token: token, password: "again12345", password_confirmation: "again12345" }, as: :json
      expect(response).to have_http_status(:unprocessable_content)
      expect(json["errors"].first).to include("already used")
    end

    it "expires admin links after a day" do
      log_in(admin)
      post "/api/admin/users/#{user.id}/reset_link"
      token = reset_link_token(json["url"])
      travel 25.hours do
        get "/api/password/reset", params: { token: token }
        expect(response).to have_http_status(:unprocessable_content)
        expect(json["errors"].first).to include("expired")
      end
    end

    it "is admin-only" do
      post "/api/admin/users/#{user.id}/reset_link"
      expect(response).to have_http_status(:unauthorized)
      log_in(create_user(kitchen: true))
      post "/api/admin/users/#{user.id}/reset_link"
      expect(response).to have_http_status(:forbidden)
    end
  end
end
