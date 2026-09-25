Rails.application.routes.draw do
  # Health check for Render: 200 when the app boots, 500 otherwise.
  get "up" => "rails/health#show", as: :rails_health_check

  namespace :api do
    get "/restaurant", to: "restaurant#show"
    get "/menu", to: "restaurant#menu"

    get "/me", to: "users#show"
    patch "/me", to: "users#update"
    post "/signup", to: "users#create"
    post "/login", to: "sessions#create"
    delete "/logout", to: "sessions#destroy"

    resources :orders, only: [:index, :create]
    get "/orders/:token", to: "orders#show", as: :order_tracking
    post "/orders/:token/confirm_payment", to: "orders#confirm_payment"
    post "/orders/:token/cancel", to: "orders#cancel"
    post "/stripe/webhook", to: "stripe_webhooks#create"

    resources :catering_inquiries, only: [:create]

    namespace :admin do
      resource :stats, only: [:show]
      resource :restaurant, only: [:show, :update]
      resources :orders, only: [:index, :show, :update] do
        post :refund, on: :member
      end
      resources :categories, only: [:index, :create, :update, :destroy] do
        patch :reorder, on: :collection
      end
      resources :menu_items, only: [:create, :update, :destroy] do
        patch :reorder, on: :collection
      end
      resources :photos, only: [:create]
      resources :users, only: [:index, :update]
      resources :catering_inquiries, only: [:index, :update, :destroy]
    end

    match "*path", to: ->(_env) { [404, { "Content-Type" => "application/json" }, ['{"errors":["Not found"]}']] }, via: :all
  end

  # Let React Router handle every other page (e.g. refreshing /menu or /admin).
  root "fallback#index"
  get "*path",
      to: "fallback#index",
      constraints: ->(req) { !req.xhr? && req.format.html? }
end
